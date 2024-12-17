const githubAPI = "https://api.github.com/repos/h455en/cct-mcq/contents/Collection";
const rawBaseURL = "https://raw.githubusercontent.com/h455en/cct-mcq/main/Collection/";

let quizzes = {};  // To hold all quizzes
let currentQuiz = null; // To store the selected quiz
let userAnswers = [];  // To store user's answers
let currentQuestionIndex = 0;
let timerInterval;
let totalTime;

// Elements
const quizDropdown = document.getElementById("quizDropdown");
const uploadFile = document.getElementById("uploadFile");
const startQuizBtn = document.getElementById("startQuizBtn");
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

// Fetch quizzes from GitHub
async function fetchQuizzes() {
    try {
        const response = await fetch(githubAPI);
        const files = await response.json();

        if (!Array.isArray(files)) {
            throw new Error("Unable to load quiz files.");
        }

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

// Handle quiz start
startQuizBtn.addEventListener("click", () => {
    const selectedQuiz = quizDropdown.value;

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

// Timer Function with mm:ss format
function startTimer(duration) {
    totalTime = duration;
    let timeLeft = totalTime;
    timerInterval = setInterval(() => {
        let minutes = Math.floor(timeLeft / 60);
        let seconds = timeLeft % 60;
        timer.innerText = `Time Left: ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
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

//------------
// Show Evaluation
function showEvaluation() {
    clearInterval(timerInterval);
    quizRunPage.classList.add("d-none");
    quizEvaluationPage.classList.remove("d-none");

    let score = 0;
    let userAnswersHTML = "";

    // Prepare correctAnswers array based on correct_index from currentQuiz
    const correctAnswers = currentQuiz.map(q => q.correct_index);

    currentQuiz.forEach((q, index) => {
        const userAnswer = userAnswers[index] || "No Answer";
        const correctAnswer = correctAnswers[index];  // Get the correct answer for the current question
        const isCorrect = userAnswer === correctAnswer;

        if (isCorrect) score++;

        userAnswersHTML += `
            <div>
                <strong>${index + 1}.</strong> ${userAnswer} 
                <span class="${isCorrect ? 'text-success' : 'text-danger'}">
                    ${isCorrect ? '✅' : '❌'}
                </span>
            </div>
        `;
    });

    resultsArea.innerHTML = `<h4>Your Score: ${score} / ${currentQuiz.length}</h4>`;
    userAnswerArea.innerHTML = userAnswersHTML;
}

// Load quizzes on page load
fetchQuizzes();
