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

        const allItems = [];

        async function fetchDirectoryContents(item) {
            if (item.type === "dir") {
                try {
                    const dirResponse = await fetch(item.url); // Use item.url to fetch directory contents
                    if (!dirResponse.ok) {
                        throw new Error(`HTTP error ${dirResponse.status} fetching directory contents for ${item.name}`);
                    }
                    const dirContents = await dirResponse.json();
                    // Extract only the necessary data from the directory contents
                    const formattedDirContents = dirContents.map(dirItem => ({
                        name: dirItem.name,
                        type: dirItem.type,
                        url: dirItem.url,
                        download_url: dirItem.download_url
                    }));
                    item.content = formattedDirContents;
                    allItems.push(item);
                    for (const subItem of item.content) {
                        await fetchDirectoryContents(subItem);
                    }
                } catch (dirError) {
                    console.error(`Error fetching directory ${item.name}:`, dirError);
                }
            } else {
                allItems.push(item);
            }
        }

        for (const item of items) {
            await fetchDirectoryContents(item);
        }

        // Now that all items (files and directories with contents) are fetched, build the dropdown
        function buildDropdownOptions(data, depth = 0) {
            let optionsHTML = "";
            data.forEach(item => {
                const indent = "  ".repeat(depth * 2);
                optionsHTML += item.type === "dir"
                    ? `<optgroup label="${indent}${item.name}">`
                    + buildDropdownOptions(item.content || [], depth + 1) // Handle cases where content might be undefined
                    + `</optgroup>`
                    : `<option value="${item.download_url}">${indent}${item.name}</option>`; // Use download_url
            });
            return optionsHTML;
        }

        const dropdownHTML = buildDropdownOptions(allItems);
        quizDropdown.innerHTML = `<option value="" disabled selected>Choose a Quiz</option>` + dropdownHTML;

        // Preload quiz data (adjusted for nested structure and download_url)
        const loadQuizData = async (item) => {
            if (item.download_url) { // Only load if it's a file with a download URL
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

        allItems.forEach(async item => await loadQuizData(item));
        startQuizBtn.disabled = false;
    } catch (error) {
        console.error("Error fetching quiz data:", error);
        alert("Failed to load quizzes. Please check your internet connection or the quiz source.");
        startQuizBtn.disabled = true;
    }
}
//----------

function getSelectedQuizName() {
    if (uploadFile.files.length > 0) {
        return uploadFile.files[0].name;
    } else {
        const selectedOption = quizDropdown.options[quizDropdown.selectedIndex];
        return selectedOption ? selectedOption.text.trim() : null; // Get the text content
    }
}

//----------

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

// Reset quiz state to prepare for restarting
function resetQuizState() {
    currentQuiz = null;  // Clear the current quiz data
    userAnswers = [];  // Clear user answers
    currentQuestionIndex = 0;  // Reset question index
    correctAnswers = [];  // Clear correct answers
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

    let resultsText = `[${dateTimeString}] - Quiz Name: ${selectedQuizzName}\n`;
    resultsText += `Score: ${score}/${currentQuiz.length} - ${percentage}%\n`;

    var formattedUserAnswers = userAnswers.map((e, i) => (i + 1 + "." + e)).join(' ,');
    var formattedCorrectAnswers = correctAnswers.map((e, i) => (i + 1 + "." + e)).join(' ,');

    resultsText += `User answers =  ${formattedUserAnswers}\n`;
    resultsText += `Correct answers =  ${formattedCorrectAnswers}\n`;

    document.getElementById('score').innerText = score;
    document.getElementById('totalQuestions').innerText = currentQuiz.length;
    document.getElementById('percentage').innerText = percentage;
    document.getElementById('qName').innerText = selectedQuizzName;
    document.getElementById('resultsTextArea').innerHTML = resultsText;


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



//____________________________

// Load quizzes on page load
fetchQuizzes();