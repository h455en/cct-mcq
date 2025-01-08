



const githubAPI = "https://api.github.com/repos/h455en/cct-mcq/contents/Collection";
const rawBaseURL = "https://raw.githubusercontent.com/h455en/cct-mcq/main/Collection/";
const githubToken = "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";

let quizzes = {};  // To hold all quizzes
let currentQuiz = null; // To store the selected quiz
let userAnswers = [];  // To store user's answers
let markedAnswers = [];
let correctAnswers = [];
let currentQuestionIndex = 0;
let timerInterval;
let totalTime;
let selectedQuizName = null;

// Elements
const quizSelectionPage = document.getElementById("quiz-selection");
const quizRunPage = document.getElementById("quiz-run");
const quizEvaluationPage = document.getElementById("quiz-evaluation");
const quizDropdown = document.getElementById("quizDropdown");
const uploadFile = document.getElementById("uploadFile");
const startQuizBtn = document.getElementById("startQuizBtn");
const reStartQuizBtn = document.getElementById("restartBtn");

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
        const headers = {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github.v3+json"
        };

        // Show loading spinner
        const loadingIndicator = document.getElementById("loadingIndicator");
        loadingIndicator.classList.remove("d-none");

        const response = await fetch(githubAPI, { headers });
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
                    const dirResponse = await fetch(item.url, { headers });
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

        // Fetch contents of all directories recursively
        await Promise.all(items.map(fetchDirectoryContents));

        // Build tree view HTML dynamically
        function buildTreeView(data) {
            let treeHTML = "<ul class='list-group'>";
            data.forEach(item => {
                if (item.type === "dir") {
                    // Collapsible folder
                    treeHTML += `
                        <li class="list-group-item folder-item">
                            <a href="#" class="folder-toggle" data-bs-target="#folder-${item.name}">
                                📁 ${item.name}
                            </a>
                            <div class="folder-contents collapse" id="folder-${item.name}">
                                ${item.content ? buildTreeView(item.content) : ""}
                            </div>
                        </li>
                    `;
                } else if (item.type === "file" && item.download_url) {
                    // JSON file (leaf node)
                    treeHTML += `
                        <li class="list-group-item">
                            <a href="#" class="quiz-select" data-url="${item.download_url}" data-name="${item.name}">
                                📄 ${item.name}
                            </a>
                        </li>
                    `;
                }
            });
            treeHTML += "</ul>";
            return treeHTML;
        }

        // Render tree view
        const treeViewHTML = buildTreeView(items);
        const quizTreeView = document.getElementById("quizTreeView");
        quizTreeView.innerHTML = treeViewHTML;

        // Hide loading spinner
        loadingIndicator.classList.add("d-none");

        // Attach event listeners to folders for toggling
        document.querySelectorAll(".folder-toggle").forEach(folder => {
            folder.addEventListener("click", (e) => {
                e.preventDefault();
                const target = document.querySelector(folder.getAttribute("data-bs-target"));
                if (target.classList.contains("collapse")) {
                    target.classList.remove("collapse");
                } else {
                    target.classList.add("collapse");
                }
            });
        });

        // Attach event listeners to leaf nodes (JSON files)
        document.querySelectorAll(".quiz-select").forEach(quiz => {
            quiz.addEventListener("click", async (e) => {
                e.preventDefault();
                const quizUrl = quiz.getAttribute("data-url");
                const quizName = quiz.getAttribute("data-name");

                //if (confirm(`Do you want to load and run the quiz "${quizName}"?`)) {
                try {
                    const quizResponse = await fetch(quizUrl);
                    if (!quizResponse.ok) {
                        throw new Error(`HTTP error ${quizResponse.status} loading ${quizName}`);
                    }
                    const quizData = await quizResponse.json();
                    quizzes[quizName] = preprocessQuizData(quizData);
                    console.log(`Quiz "${quizName}" loaded successfully!`);
                    startQuiz(quizData); // Immediately start the quiz
                } catch (error) {
                    console.error(`Error loading quiz file ${quizName}:`, error);
                    alert(`Failed to load the quiz "${quizName}".`);
                }
            });
        });

        console.log("Quizzes and folders loaded successfully.");
    } catch (error) {
        console.error("Error fetching quiz data:", error);
        alert("Failed to load quizzes. Please check your internet connection or the quiz source.");
    }
}


function getSelectedQuizName() {
    if (uploadFile.files.length > 0) {
        return uploadFile.files[0].name;
    } else {
        const selectedOption = quizDropdown.options[quizDropdown.selectedIndex];
        console.log(`Selected option value = ${selectedOption.value} text = ${selectedOption.text}`);
        selectedQuizzName = quizName; //selectedOption.text;
        return selectedOption ? selectedOption.text.trim() : null; // Get the text content
    }
}

// Process and store correct answers
function preprocessQuizData(quizData) {
    quizData.forEach(q => {
        correctAnswers.push(q.correct_index);
        // convert to letter if needed
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

            startQuiz(currentQuiz);
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
    startQuiz(currentQuiz);
});


function startQuiz(quizData) {
    // Validate the provided quiz data
    if (!quizData || !Array.isArray(quizData) || quizData.length === 0) {
        console.error("Invalid quiz data provided:", quizData);
        alert("Error: The selected quiz is empty or invalid.");
        return;
    }

    // Assign the quiz data to currentQuiz
    currentQuiz = quizData;

    // Transition to the quiz run page
    quizSelectionPage.classList.add("d-none");
    quizRunPage.classList.remove("d-none");

    // Reset quiz state
    currentQuestionIndex = 0;
    userAnswers = [];
    markedAnswers = [];

    // Start the timer
    const secondsPerQuestion = 30; // 30 seconds per question
    startTimer(currentQuiz.length * secondsPerQuestion);

    // Load the first question
    loadQuestion();
}

function loadQuestion() {
    // Check if currentQuiz is valid and the question index is within bounds
    if (!currentQuiz || currentQuestionIndex >= currentQuiz.length) {
        console.error("No valid question to load. currentQuiz:", currentQuiz, "currentQuestionIndex:", currentQuestionIndex);
        alert("Error: No questions available in the quiz.");
        return;
    }

    const currentQuestion = currentQuiz[currentQuestionIndex];

    // Validate the current question structure
    if (!currentQuestion || !currentQuestion.question || !Array.isArray(currentQuestion.options)) {
        console.error("Invalid question structure:", currentQuestion);
        alert("Error: Invalid question format.");
        return;
    }

    // Render the question title
    questionTitle.innerText = `Q${currentQuestionIndex + 1}: ${currentQuestion.question}`;

    // Render the options dynamically
    optionsContainer.innerHTML = currentQuestion.options
        .map(
            (option, index) => `
            <div class="form-check">
                <input class="form-check-input" type="radio" name="option" value="${index}" id="option${index}">
                <label class="form-check-label" for="option${index}">
                    ${option}
                </label>
            </div>
        `
        )
        .join("");

    //console.log("Loaded Question:", currentQuestion);
}


markRadio.addEventListener('change', () => {
    if (markRadio.checked) {
        markedAnswers.push(currentQuestionIndex + 1);
    }
    console.log("Marked Answers:", markedAnswers);
});

nextBtn.addEventListener("click", () => {
    // Validate currentQuiz
    if (!currentQuiz || !Array.isArray(currentQuiz) || currentQuiz.length === 0) {
        console.error("Invalid or empty quiz data:", currentQuiz);
        alert("Error: No quiz data available.");
        return;
    }

    // Record the user's answer for the current question
    const selectedOption = document.querySelector('input[name="option"]:checked');
    if (!selectedOption) {
        alert("Please select an option before proceeding.");
        return;
    }
    userAnswers[currentQuestionIndex] = parseInt(selectedOption.value);

    // Move to the next question or end the quiz
    currentQuestionIndex++;
    if (currentQuestionIndex < currentQuiz.length) {
        loadQuestion(); // Load the next question
    } else {
        showEvaluation(); // Show evaluation if all questions are answered
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

//..........
function showEvaluation() {
    clearInterval(timerInterval);
    quizRunPage.classList.add("d-none");
    quizEvaluationPage.classList.remove("d-none");

    let score = 0;

    // Map numeric user answers to letter equivalents (A, B, C, D)
    const indexToLetter = ["A", "B", "C", "D"];
    const userAnswersAsLetters = userAnswers.map(answer => indexToLetter[answer] || "No Answer");

    console.log("Correct answers = ", correctAnswers);
    console.log("User answers = ", userAnswersAsLetters);

    const questionsAccordion = document.getElementById('questionsAccordion');
    questionsAccordion.innerHTML = ""; // Clear previous results

    // Create expandable text area for detailed results
    const resultsTextArea = document.createElement('textarea');
    resultsTextArea.id = 'resultsTextArea';
    resultsTextArea.className = 'form-control mt-3';
    resultsTextArea.rows = 6; // Initial number of rows
    resultsTextArea.style.resize = 'vertical'; // Allow vertical resizing
    resultsArea.appendChild(resultsTextArea);

    currentQuiz.forEach((q, index) => {
        const userAnswer = userAnswersAsLetters[index] || "No Answer";
        const correctAnswer = correctAnswers[index];
        const isCorrect = userAnswer === correctAnswer;

        if (isCorrect) {
            score++;
        }
        const isMarked = markedAnswers.includes(index + 1); // Highlight marked questions
        const accordionItem = document.createElement('div');
        accordionItem.className = 'accordion-item';
        accordionItem.innerHTML = `
            <h2 class="accordion-header" id="heading${index}">
                <button class="accordion-button collapsed ${isCorrect ? "" : "text-danger"}" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${index}" aria-expanded="false" aria-controls="collapse${index}">
                    ${index + 1}. ${userAnswer} ${isCorrect ? "✅" : "❌"} ${isMarked ? "💡" : ""}
                </button>
            </h2>
            <div id="collapse${index}" class="accordion-collapse collapse" aria-labelledby="heading${index}" data-bs-parent="#questionsAccordion">
                <div class="accordion-body">
                    <p><strong>Question:</strong> ${q.question}</p>
                    <ul>
                        ${q.options.map((option, i) => `<li>${indexToLetter[i]}. ${option}</li>`).join('')}
                    </ul>
                    <p><strong>Correct Answer:</strong> ${correctAnswer}</p>
                    <p><strong>Explanation:</strong> ${q.explanation || "No explanation provided."}</p>
                </div>
            </div>
        `;
        questionsAccordion.appendChild(accordionItem);
    });

    const percentage = Math.round((score / currentQuiz.length) * 100);
    const dateTimeString = formatDate();
    let resultsText = `[${dateTimeString}] - Quiz Name: ${selectedQuizName} - Score: ${score}/${currentQuiz.length} - ${percentage}%\n`;

    const formattedUserAnswers = userAnswersAsLetters.map((e, i) => `${i + 1}.${e}`).join(' , ');
    const formattedCorrectAnswers = correctAnswers.map((e, i) => `${i + 1}.${e}`).join(' , ');

    resultsText += `User answers =  ${formattedUserAnswers}\n`;
    resultsText += `Correct answers =  ${formattedCorrectAnswers}\n`;

    document.getElementById('score').innerText = score;
    document.getElementById('totalQuestions').innerText = currentQuiz.length;
    document.getElementById('percentage').innerText = percentage;
    document.getElementById('qName').innerText = selectedQuizName;
    resultsTextArea.value = resultsText; // Populate the text area with results

    // Add "Copy to Clipboard" button
    const copyButton = document.createElement('button');
    copyButton.textContent = "Copy to Clipboard";
    copyButton.className = "btn btn-primary btn-sm mt-3"; // Add Bootstrap styling
    resultsArea.appendChild(copyButton);

    copyButton.addEventListener('click', () => {
        const textToCopy = resultsTextArea.value;
        copyToClipboard(textToCopy);
        alert("Results copied to clipboard!");
    });

    // Format the date and time
    function formatDate() {
        const now = new Date();
        return `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()} - ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    }
}


//........

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


function setupGoHomeButton() {
    const goHomeBtn = document.getElementById('goHomeBtn');
    const quizSelectionPage = document.getElementById("quiz-selection");
    const quizRunPage = document.getElementById("quiz-run");
    const quizEvaluationPage = document.getElementById("quiz-evaluation");

    if (goHomeBtn && quizSelectionPage && quizRunPage && quizEvaluationPage) {
        goHomeBtn.addEventListener('click', () => {
            quizEvaluationPage.classList.add("d-none");
            quizRunPage.classList.add("d-none");
            quizSelectionPage.classList.remove("d-none");
            currentQuestionIndex = 0;
            userAnswers = [];
            markedQuestions = [];
            clearInterval(timerInterval);
            if (typeof resetQuiz === 'function') resetQuiz(); // call resetQuiz if defined
        });
    } else {
        console.error("One or more required elements (goHomeBtn, quizSelectionPage, quizRunPage, quizEvaluationPage) not found.");
    }
}

document.addEventListener('DOMContentLoaded', () => {
    fetchQuizzes();
    setupGoHomeButton(); // Call the function to set up the button
});
//----

// Load quizzes on page load
fetchQuizzes();