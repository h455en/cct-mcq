let questions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let remainingTime = 0;
let totalQuizTime = 0;
let timer;

const fileInput = document.getElementById('file-input');
const startBtn = document.getElementById('start-btn');
const quizContainer = document.getElementById('quiz-container');
const questionContainer = document.getElementById('question-container');
const timerBar = document.getElementById('timer-bar');
const nextBtn = document.getElementById('next-btn');
const answersTextarea = document.getElementById('answers');
const copyBtn = document.getElementById('copy-btn');
const submitSection = document.getElementById('submit-section');
const alertContainer = document.getElementById('alert-container');
const questionProgress = document.getElementById('question-progress');
const questionProgressBar = document.getElementById('question-progress-bar');
const scoreDisplay = document.getElementById('score-display');

fileInput.addEventListener('change', function (event) {
    const file = event.target.files[0];
    if (file && file.name.endsWith('.json')) {
        const reader = new FileReader();
        reader.onload = function (e) {
            try {
                questions = JSON.parse(e.target.result);
                document.getElementById('file-info').innerText = `${questions.length} questions loaded.`;
                startBtn.disabled = false;
            } catch {
                showAlert('danger', 'Invalid JSON file');
            }
        };
        reader.readAsText(file);
    }
});

startBtn.addEventListener('click', function () {
    totalQuizTime = questions.length * 30;
    remainingTime = totalQuizTime;
    document.getElementById('loader-container').style.display = 'none';
    quizContainer.style.display = 'block';
    generateQuiz();
    startTimer();
    updateQuestionProgress();
});

nextBtn.addEventListener('click', handleNextQuestion);

function generateQuiz() {
    nextBtn.style.display = 'none';
    const currentQuestion = questions[currentQuestionIndex];
    questionContainer.innerHTML = `<div class="question">${currentQuestionIndex + 1}. ${currentQuestion.question}</div>`;
    const optionsList = document.createElement('ul');
    optionsList.classList.add('options');
    currentQuestion.options.forEach((option, i) => {
        const optionItem = document.createElement('li');
        optionItem.classList.add('option-item');
        optionItem.innerHTML = `
            <input type="radio" name="option" id="option${i}" value="${option}">
            <label for="option${i}">${String.fromCharCode(65 + i)}. ${option}</label>`;
        optionItem.addEventListener('click', function () {
            userAnswers[currentQuestionIndex] = option;
            highlightSelection(optionItem);
            nextBtn.style.display = 'block';
        });
        optionsList.appendChild(optionItem);
    });
    questionContainer.appendChild(optionsList);
}

function handleNextQuestion() {
    if (currentQuestionIndex < questions.length - 1) {
        currentQuestionIndex++;
        generateQuiz();
        updateQuestionProgress();
    } else {
        endQuiz();
    }
}

function highlightSelection(selectedItem) {
    const options = document.querySelectorAll('.option-item');
    options.forEach((option) => option.classList.remove('selected'));
    selectedItem.classList.add('selected');
}

function startTimer() {
    clearInterval(timer);
    timer = setInterval(() => {
        remainingTime--;
        updateTimer();
        if (remainingTime <= 0) {
            clearInterval(timer);
            endQuiz();
        }
    }, 1000);
}

function updateTimer() {
    const minutes = Math.floor(remainingTime / 60);
    const seconds = remainingTime % 60;
    timerBar.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    timerBar.style.width = `${(remainingTime / totalQuizTime) * 100}%`;
}


function updateQuestionProgress() {
    // Update the text showing the current question and total questions
    questionProgress.textContent = `${currentQuestionIndex + 1}/${questions.length}`;

    // Calculate the percentage of progress
    const progressPercentage = ((currentQuestionIndex + 1) / questions.length) * 100;

    // Update the progress bar style
    questionProgressBar.style.width = `${progressPercentage}%`;
    questionProgressBar.setAttribute('aria-valuenow', Math.round(progressPercentage)); // For accessibility
    questionProgressBar.textContent = `${currentQuestionIndex + 1}/${questions.length}`;
}




function endQuiz() {
    quizContainer.style.display = 'none';
    submitSection.style.display = 'block';

    // Calculate score
    const correctCount = calculateScore();
    const scorePercentage = Math.round((correctCount / questions.length) * 100);
    scoreDisplay.textContent = `You scored: ${scorePercentage}% (${correctCount}/${questions.length})`;

    // Generate detailed results with question numbers
    let results = '';
    questions.forEach((q, i) => {
        const correctOptionIndex = q.options.indexOf(q.correct);
        const userAnswerIndex = q.options.indexOf(userAnswers[i]);
        const isCorrect = userAnswerIndex === correctOptionIndex;

        const resultSymbol = isCorrect ? '✅' : '❌';
        const userOptionLetter = userAnswerIndex !== -1 ? String.fromCharCode(65 + userAnswerIndex) : 'N/A'; // Handle unanswered cases

        results += `${i + 1}.${userOptionLetter} ${resultSymbol}\n`;
    });

    // Show results in the textarea
    answersTextarea.value = results.trim();

    // Expand textarea to fit content
    answersTextarea.style.height = 'auto';
    answersTextarea.style.height = `${answersTextarea.scrollHeight}px`;
}




function calculateScore() {
    let correctCount = 0;
    questions.forEach((question, index) => {
        if (userAnswers[index] === question.correct) {
            correctCount++;
        }
    });
    return correctCount;
}


copyBtn.addEventListener('click', function () {
    navigator.clipboard.writeText(answersTextarea.value)
        .then(() => showAlert('success', 'Answers copied to clipboard!'))
        .catch(() => showAlert('danger', 'Failed to copy answers.'));
});

function showAlert(type, message) {
    const alert = document.createElement('div');
    alert.classList.add('alert', `alert-${type}`);
    alert.innerText = message;
    alertContainer.appendChild(alert);

    // Automatically dismiss after 5 seconds
    setTimeout(() => {
        alert.remove();
    }, 5000);
}
