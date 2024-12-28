const githubAPI = "https://api.github.com/repos/h455en/cct-mcq/contents/Collection";
const rawBaseURL = "https://raw.githubusercontent.com/h455en/cct-mcq/main/Collection/";

let quizzes = {};  // To hold all quizzes
let currentQuiz = null; // To store the selected quiz
let userAnswers = [];  // To store user's answers
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

// Fetch quizzes from GitHub
async function fetchQuizzes() {
    try {
        const response = await fetch(githubAPI);
        const files = await response.json();

        if (!Array.isArray(files)) {
            throw new Error("Unable to load quiz files.");
        }

        files.sort((a, b) => a.name.localeCompare(b.name));
        const dropdownHTML = files.map(file => {
            return `<option value="${file.name}">${file.name}</option>`;
        }).join("");
        quizDropdown.innerHTML = `<option value="" disabled selected>Choose a Quiz</option>` + dropdownHTML;

        // Preload quiz data
        files.forEach(async file => {
            try {
                const quizResponse = await fetch(rawBaseURL + file.name);
                const quizData = await quizResponse.json();
                quizzes[file.name] = preprocessQuizData(quizData); // Ensure we preprocess each quiz
            } catch (error) {
                console.error(`Error loading quiz file ${file.name}:`, error);
            }
        });
    } catch (error) {
        console.error("Error fetching quiz data:", error);
    }
}

// Process and store correct answers
function preprocessQuizData(quizData) {
    quizData.forEach(q => {
        const correctAnswerLetter = getOptionLetter(q.correct_index);
        q.correctAnswer = correctAnswerLetter;  // Store correct answer directly in each question
    });
    console.log("Processed Quiz Data:", quizData); // Debugging log
    return quizData; // Return processed quiz data
}

// Convert index to option letter (A, B, C, D)
function getOptionLetter(index) {
    return ['A', 'B', 'C', 'D'][index];
}


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
    const selectedQuiz = quizDropdown.value;
    selectedQuizzName = quizDropdown.value || (uploadFile.files.length > 0 ? uploadFile.files[0].name : null);
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

    if (!selectedQuiz) return alert("Please select a quiz!");

    currentQuiz = quizzes[selectedQuiz];
    console.log("Selected Quiz:", currentQuiz); // Debugging log

    if (!currentQuiz) return alert("Quiz not loaded yet, please try again.");

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
    startTimer(currentQuiz.length * 30);
    loadQuestion();
}

// Load Question
function loadQuestion() {
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
}

function showEvaluation() {
    clearInterval(timerInterval);
    quizRunPage.classList.add("d-none");
    quizEvaluationPage.classList.remove("d-none");

    let score = 0;
    // Prepare correctAnswers array based on correct_index from currentQuiz
    const correctAnswers = currentQuiz.map(q => q.correct_index);
    console.log("Correct answers = ", correctAnswers);
    console.log("   User answers = ", userAnswers);
    const questionsAccordion = document.getElementById('questionsAccordion');
    questionsAccordion.innerHTML = ""; // Clear previous results

    currentQuiz.forEach((q, index) => {
        const userAnswer = userAnswers[index] || "No Answer";
        const correctAnswer = correctAnswers[index];
        const isCorrect = userAnswer === correctAnswer;
        score += isCorrect ? 1 : 0;

        const accordionItem = document.createElement('div');
        accordionItem.className = 'accordion-item';
        accordionItem.innerHTML = `
              <h2 class="accordion-header" id="heading${index}">
                  <button class="accordion-button collapsed ${isCorrect ? "" : "text-danger"}" type="button" data-bs-toggle="collapse" data-bs-target="#collapse${index}" aria-expanded="false" aria-controls="collapse${index}">
                      ${index + 1}. ${userAnswer} ${isCorrect ? "✅" : "❌"}
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

    //-----------------------
    // Create expandable text area
    const resultsTextArea = document.createElement('textarea');
    resultsTextArea.id = 'resultsTextArea';
    resultsTextArea.className = 'form-control mt-3';
    resultsTextArea.rows = 5; // Initial number of rows
    resultsTextArea.style.resize = 'vertical'; // Allow vertical resizing
    resultsArea.appendChild(resultsTextArea);

    const now = new Date();
    const dateTimeString = `${now.getDate().toString().padStart(2, '0')}.${(now.getMonth() + 1).toString().padStart(2, '0')}.${now.getFullYear()} - ${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

    let resultsText = ''; //`Quiz Name: ${selectedQuizName}\n`;
    resultsText += `Date/Time: ${dateTimeString}\n`;
    //resultsText += `Score: ${score}/${currentQuiz.length} - ${percentage}%\n`;
    resultsText += "User Answers:\n";
    //-------------------------

    const percentage = Math.round((score / currentQuiz.length) * 100);
    document.getElementById('score').innerText = score;
    document.getElementById('totalQuestions').innerText = currentQuiz.length;
    document.getElementById('percentage').innerText = percentage;
    document.getElementById('qName').innerText = selectedQuizzName;
    myResults = `<p>Correct Answer: ${selectedQuizzName} / Total = ${currentQuiz.length}</p>`;
    document.getElementById('resultsTextArea').innerHTML = resultsText;






}

//____________________________

// Load quizzes on page load
fetchQuizzes();