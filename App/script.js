const githubAPI = "https://api.github.com/repos/h455en/cct-mcq/contents/Collection";
const rawBaseURL = "https://raw.githubusercontent.com/h455en/cct-mcq/main/Collection/";

let quizzes = {};  // To hold all quizzes
let currentQuiz = null; // To store the selected quiz
let userAnswers = [];  // To store user's answers
let markedAnswers = [];
let currentQuestionIndex = 0;
let timerInterval;
let totalTime;
let selectedQuizzName = null;
// Elements
const quizDropdown = document.getElementById("quizDropdown");
const uploadFile = document.getElementById("uploadFile");
const startQuizBtn = document.getElementById("startQuizBtn");
const reStartQuizBtn = document.getElementById("restartBtn");
const quizSelectionPage = document.getElementById("quiz-selection");
const quizRunPage = document.getElementById("quiz-run");
const quizEvaluationPage = document.getElementById("quiz-evaluation");
const questionTitle = document.getElementById("questionTitle");
const optionsContainer = document.getElementById("optionsContainer");
const nextBtn = document.getElementById("nextBtn");
const progressBar = document.getElementById("progressBar");
const timer = document.getElementById("timer");
const resultsArea = document.getElementById("resultsArea");
const userAnswerArea = document.getElementById("userAnswers");
const correctAnswerArea = document.getElementById("correctAnswers");
const searchQuestionInput = document.getElementById('searchQuestion');
const darkModeToggle = document.getElementById("darkModeToggle");
const markRadio = document.getElementById('markQuestion'); // Get the radio button
const resultsTextArea = document.getElementById('resultsTextArea'); // Get the textarea


//------------

async function fetchQuizzes() {
    try {
        const response = await fetch(githubAPI);
        if (!response.ok) {
            throw new Error(`HTTP error ${response.status} fetching quiz list`);
        }
        const items = await response.json();

        if (!Array.isArray(items)) {
            throw new Error("Invalid quiz list format received from API.");
        }

        async function fetchDirectoryContents(item) {
            if (item.type === "dir") {
                try {
                    const dirResponse = await fetch(item.url);
                    if (!dirResponse.ok) {
                        throw new Error(`HTTP error ${dirResponse.status} fetching directory contents for ${item.name}`);
                    }
                    const dirContents = await dirResponse.json();
                    item.content = dirContents.map(dirItem => ({
                        name: dirItem.name,
                        type: dirItem.type,
                        url: dirItem.url,
                        download_url: dirItem.download_url
                    }));
                    for (const subItem of item.content) {
                        await fetchDirectoryContents(subItem);
                    }
                } catch (dirError) {
                    console.error(`Error fetching directory ${item.name}:`, dirError);
                }
            }
        }

        // Fetch contents of all directories
        await Promise.all(items.map(fetchDirectoryContents));

        // Build the dropdown (only top-level items)
        function buildDropdownOptions(data, depth = 0) {
            let optionsHTML = "";
            data.forEach(item => {
                const indent = "  ".repeat(depth * 2);
                if (item.type === "dir") {
                    optionsHTML += `<optgroup label="${indent}${item.name}">`;
                    if (item.content) { // Check if content exists before recursing
                        optionsHTML += buildDropdownOptions(item.content, depth + 1);
                    }
                    optionsHTML += `</optgroup>`;
                } else {
                    optionsHTML += `<option value="${item.download_url}">${indent}${item.name}</option>`;
                }
            });
            return optionsHTML;
        }

        const dropdownHTML = buildDropdownOptions(items);
        quizDropdown.innerHTML = `<option value="" disabled selected>Choose a Quiz</option>` + dropdownHTML;

        // Preload quiz data (using download_url)
        const loadQuizData = async (item) => {
            if (item.download_url) {
                try {
                    const quizResponse = await fetch(item.download_url);
                    if (!quizResponse.ok) {
                        throw new Error(`HTTP error ${quizResponse.status} loading ${item.name}`);
                    }
                    const quizData = await quizResponse.json();
                    quizzes[item.name] = preprocessQuizData(quizData);
                } catch (error) {
                    console.error(`Error loading quiz file ${item.name}:`, error);
                }
            }
        };

        // Preload only the files that are directly in the root or in subfolders.
        items.forEach(async item => {
            if (item.type === 'file') {
                await loadQuizData(item);
            } else if (item.content) {
                item.content.forEach(async subItem => {
                    await loadQuizData(subItem);
                });
            }
        });

        startQuizBtn.disabled = false;
    } catch (error) {
        console.error("Error fetching quiz data:", error);
        alert("Failed to load quizzes. Please check your internet connection or the quiz source.");
        startQuizBtn.disabled = true;
    }
}

//------------

function getSelectedQuizName() {
    if (uploadFile.files.length > 0) {
        return uploadFile.files[0].name;
    } else {
        const selectedOption = quizDropdown.options[quizDropdown.selectedIndex];
        console.log("Selected option value = ", selectedOption.value);
        selectedQuizzName = selectedOption.text;
        return selectedOption ? selectedOption.text.trim() : null; // Get the text content
    }
}

// Process and store correct answers
function preprocessQuizData(quizData) {
    quizData.forEach(q => {
        const correctAnswerLetter = getOptionLetter(q.correct_index);
        q.correctAnswer = correctAnswerLetter;  // Store correct answer directly in each question
    });
    return quizData;
}


function getOptionLetter(index) {
    return ['A', 'B', 'C', 'D'][index]; // Convert index to option letter (A, B, C, D)
}

// Add a click event listener to toggle dark mode
darkModeToggle.addEventListener("click", () => {
    console.log(">>> Activating dark mode ...")
    document.body.classList.toggle("dark-mode"); // Toggle dark mode class
});

// After displayResults is called

searchQuestionInput.addEventListener('input', () => {
    const questionNumber = parseInt(searchQuestionInput.value);
    if (!isNaN(questionNumber) && questionNumber > 0 && questionNumber <= currentQuiz.length) {
        const targetAccordionItem = document.getElementById(`collapse${questionNumber - 1}`);
        if (targetAccordionItem) {
            targetAccordionItem.scrollIntoView({ behavior: 'smooth', block: 'start' });
            // Show the accordion item
            const bsCollapse = new bootstrap.Collapse(targetAccordionItem, { toggle: true });
        }
    }
});

// Handle quiz start
startQuizBtn.addEventListener("click", () => {
    selectedQuizName = getSelectedQuizName();

    if (uploadFile.files.length > 0) {
        const file = uploadFile.files[0];
        const reader = new FileReader();

        reader.onload = function (event) {
            const jsonData = JSON.parse(event.target.result);
            currentQuiz = preprocessQuizData(jsonData);
            console.log("Uploaded Quiz:", currentQuiz); // Debugging log

            startQuiz();
        };

        reader.readAsText(file);
        return;
    }

    if (!selectedQuizName) return alert("Please select a quiz!");

    // Find the quiz data based on the filename
    const selectedQuizEntry = Object.entries(quizzes).find(([key, value]) => key.trim() === selectedQuizName.trim());

    if (!selectedQuizEntry) {
        return alert("Quiz not loaded yet, please try again.");
    }

    currentQuiz = selectedQuizEntry[1];
    startQuiz();
});


// Start Quiz
function startQuiz() {
    if (!currentQuiz || currentQuiz.length === 0) {
        console.error("Error: No quiz data loaded!");
        return alert("Quiz data not loaded properly.");
    }

    quizSelectionPage.classList.add("d-none");
    quizRunPage.classList.remove("d-none");

    currentQuestionIndex = 0;
    userAnswers = []; // Reset user answers
    markedAnswers = []; // Reset marked answers
    let secondsPerQuestion = 300; // 30 by default 
    startTimer(currentQuiz.length * secondsPerQuestion);

    document.getElementById('qName').innerText = selectedQuizzName;
    loadQuestion();
}

// Load Question
function loadQuestion() {
    resetMarkQuestionSwitch(); // Reset the switch when loading a new question
    // Get if marked
    const currentQuestion = currentQuiz[currentQuestionIndex];
    questionTitle.innerText = `Q${currentQuestionIndex + 1}: ${currentQuestion.question}`;
    optionsContainer.innerHTML = currentQuestion.options.map((option, index) => `
        <div class="form-check">
            <input class="form-check-input" type="radio" name="option" value="${index}" id="option${index}">
            <label class="form-check-label" for="option${index}">${option}</label>
        </div>
    `).join("");

    updateProgressBar();
}

markRadio.addEventListener('change', () => {
    if (markRadio.checked) {
        markedAnswers.push(currentQuestionIndex + 1);
    }
    console.log("Marked Answers:", markedAnswers);
});


// Record User's Answer (As 'A', 'B', 'C', 'D')
nextBtn.addEventListener("click", () => {
    const selectedOption = document.querySelector('input[name="option"]:checked');
    if (!selectedOption) return alert("Please select an option!");

    const selectedIndex = parseInt(selectedOption.value);
    userAnswers[currentQuestionIndex] = getOptionLetter(selectedIndex); // Store the answer as 'A', 'B', 'C', 'D'
    currentQuestionIndex++;

    if (currentQuestionIndex < currentQuiz.length) {
        loadQuestion();
    } else {
        showEvaluation(); // Call evaluation when all questions are answered
    }
});


function startTimer(duration) {
    totalTime = duration;
    let timeLeft = totalTime;
    const progressBar = document.getElementById('progress-bar');
    const timer = document.getElementById('timer');

    timer.innerText = `Time Left: ${String(Math.floor(timeLeft / 60)).padStart(2, '0')}:${String(timeLeft % 60).padStart(2, '0')}`;

    timerInterval = setInterval(() => {
        let minutes = Math.floor(timeLeft / 60);
        let seconds = timeLeft % 60;

        // Update the timer text
        timer.innerText = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

        // Update progress bar value
        let progress = ((totalTime - timeLeft) / totalTime) * 100;
        progressBar.value = progress;

        timeLeft--;

        if (timeLeft < 0) {
            clearInterval(timerInterval);
            showEvaluation();
        }
    }, 1000);
}

// Progress Bar
function updateProgressBar() {
    const progress = ((currentQuestionIndex + 1) / currentQuiz.length) * 100;
    progressBar.style.width = `${progress}%`;
    progressBar.innerText = `${currentQuestionIndex + 1}/${currentQuiz.length}`;
}

// Restart the quiz and go back to quiz selection screen
reStartQuizBtn.addEventListener("click", () => {
    quizRunPage.classList.add("d-none");  // Hide the quiz run page
    quizEvaluationPage.classList.add("d-none");  // Hide the evaluation page
    quizSelectionPage.classList.remove("d-none");  // Show the quiz selection page

    resetQuizState();  // Reset quiz state to start over
});


function resetQuizState() {
    // Reset quiz state to prepare for restarting
    currentQuiz = null;
    userAnswers = [];
    currentQuestionIndex = 0;
    correctAnswers = [];
    selectedQuizzName = null;
    resetMarkQuestionSwitch();
}

function showEvaluation() {
    clearInterval(timerInterval);
    quizRunPage.classList.add("d-none");
    quizEvaluationPage.classList.remove("d-none");

    let score = 0;
    const correctAnswers = currentQuiz.map(q => q.correct_index);
    console.log("Correct answers = ", correctAnswers);
    console.log("   User answers = ", userAnswers);
    const questionsAccordion = document.getElementById('questionsAccordion');
    questionsAccordion.innerHTML = ""; // Clear previous results

    //__________________________________
    // Create expandable text area
    const resultsTextArea = document.createElement('textarea');
    resultsTextArea.id = 'resultsTextArea';
    resultsTextArea.className = 'form-control mt-3';
    resultsTextArea.rows = 6; // Initial number of rows
    resultsTextArea.style.resize = 'vertical'; // Allow vertical resizing
    resultsArea.appendChild(resultsTextArea);
    //__________________________________
    let isMarked = false;
    currentQuiz.forEach((q, index) => {
        const userAnswer = userAnswers[index] || "No Answer";
        const correctAnswer = correctAnswers[index];
        const isCorrect = userAnswer === correctAnswer;
        score += isCorrect ? 1 : 0;
        console.log("Marked = ", markedAnswers)
        isMarked = markedAnswers.includes(index + 1);

        const accordionItem = document.createElement('div');
        accordionItem.className = 'accordion-item';
        //evaluatedAnswer = "";
        accordionItem.innerHTML = `
              <h2 class="accordion-header" id="heading${index}">
                  <button class="accordion-button collapsed ${isCorrect ? "" : "text-danger"}" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${index}" aria-expanded="false" aria-controls="collapse${index}">
                      ${index + 1}. ${userAnswer} ${isCorrect ? "✅" : "❌"} ${isMarked ? "💡" : ""}
                  </button>
              </h2>
              <div id="collapse${index}" class="accordion-collapse collapse" aria-labelledby="heading${index}" data-bs-parent="#questionsAccordion">
                  <div class="accordion-body">
                      <p>${q.question}</p>
                      <ul>
                          ${q.options.map(option => `<li>${option}</li>`).join('')}
                      </ul>
                      <p>Correct Answer: ${correctAnswers[index]}</p>
                      <p>Explanation: ${q.explanation || "No explanation provided."}</p>
                    
                  </div>
              </div>
          `;
        questionsAccordion.appendChild(accordionItem);
    });

    const percentage = Math.round((score / currentQuiz.length) * 100);
    const dateTimeString = formatDate();
    let resultsText = `[${dateTimeString}] - Quiz Name: ${selectedQuizzName} - Score: ${score}/${currentQuiz.length} - ${percentage}%\n`;

    var formattedUserAnswers = userAnswers.map((e, i) => (i + 1 + "." + e)).join(' ,');
    var formattedCorrectAnswers = correctAnswers.map((e, i) => (i + 1 + "." + e)).join(' ,');

    resultsText += `   User answers =  ${formattedUserAnswers}\n`;
    resultsText += `Correct answers =  ${formattedCorrectAnswers}\n`;

    document.getElementById('score').innerText = score;
    document.getElementById('totalQuestions').innerText = currentQuiz.length;
    document.getElementById('percentage').innerText = percentage;
    document.getElementById('qName').innerText = selectedQuizzName;
    document.getElementById('resultsTextArea').innerHTML = resultsText;


    // Copy results
    const copyButton = document.createElement('button');
    copyButton.textContent = "Copy to Clipboard";
    copyButton.className = "btn btn-secondary mt-2"; // Add Bootstrap styling
    resultsArea.appendChild(copyButton); // Add the button to the results area

    copyButton.addEventListener('click', () => {
        const textToCopy = resultsTextArea.value;
        copyToClipboard(textToCopy);
    });

    function formatDate() {
        const now = new Date();
        const dateTimeString = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()} - ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
        return dateTimeString;
    }
}

function resetMarkQuestionSwitch() {
    const markQuestionSwitch = document.getElementById('markQuestion');
    if (markQuestionSwitch) { // Check if the element exists
        markQuestionSwitch.checked = false;
    } else {
        console.error("markQuestion element not found!");
    }
}



//------------
function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
        // Modern approach (requires HTTPS)
        navigator.clipboard.writeText(text)
            .then(() => {
                // Optional: Provide visual feedback to the user (e.g., a tooltip)
                console.log("Text copied to clipboard!");
            })
            .catch(err => {
                console.error("Failed to copy text: ", err);
                fallbackCopyToClipboard(text); // Fallback if modern API fails
            });
    } else {
        // Fallback for older browsers or non-HTTPS contexts
        fallbackCopyToClipboard(text);
    }
}

function fallbackCopyToClipboard(text) {
    const textArea = document.createElement("textarea");
    textArea.value = text;

    // Avoid scrolling to bottom
    textArea.style.top = "0";
    textArea.style.left = "0";
    textArea.style.position = "fixed";

    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();

    try {
        const successful = document.execCommand('copy');
        const msg = successful ? 'successful' : 'unsuccessful';
        console.log('Fallback: Copying text command was ' + msg);
    } catch (err) {
        console.error('Fallback: Oops, unable to copy', err);
    }

    document.body.removeChild(textArea);
}
//------------


// Load quizzes on page load
fetchQuizzes();