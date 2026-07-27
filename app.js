const DATA_URL = 'data';

// State
let state = {
    blocks: [],
    currentBlock: null,
    questions: [],
    currentIndex: 0,
    answers: {}, // { question_id: selected_letter }
    isDarkMode: false
};

// DOM Elements
const elements = {
    app: document.getElementById('app'),
    blockSelect: document.getElementById('block-select'),
    themeToggle: document.getElementById('theme-toggle'),
    btnReport: document.getElementById('btn-report'),
    reportModal: document.getElementById('report-modal'),
    closeModal: document.getElementById('close-modal'),
    statsContainer: document.getElementById('stats-container'),
    loading: document.getElementById('loading'),
    quizContainer: document.getElementById('quiz-container'),
    emptyState: document.getElementById('empty-state'),
    
    questionCounter: document.getElementById('question-counter'),
    progressPercentage: document.getElementById('progress-percentage'),
    progressBar: document.getElementById('progressBar') || document.getElementById('progress-bar'),
    
    questionNumber: document.getElementById('question-number'),
    questionText: document.getElementById('question-text'),
    questionImageContainer: document.getElementById('question-image-container'),
    questionImage: document.getElementById('question-image'),
    
    optionsContainer: document.getElementById('options-container'),
    
    feedbackContainer: document.getElementById('feedback-container'),
    feedbackMessage: document.getElementById('feedback-message'),
    
    btnPrev: document.getElementById('btn-prev'),
    btnNext: document.getElementById('btn-next')
};

// Initialization
async function init() {
    setupTheme();
    setupEventListeners();
    await fetchBlocks();
}

// Theme Management
function setupTheme() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        state.isDarkMode = true;
        elements.app.classList.remove('light-mode');
        elements.app.classList.add('dark-mode');
        elements.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
}

function toggleTheme() {
    state.isDarkMode = !state.isDarkMode;
    if (state.isDarkMode) {
        elements.app.classList.remove('light-mode');
        elements.app.classList.add('dark-mode');
        elements.themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
        localStorage.setItem('theme', 'dark');
    } else {
        elements.app.classList.remove('dark-mode');
        elements.app.classList.add('light-mode');
        elements.themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
        localStorage.setItem('theme', 'light');
    }
}

// Event Listeners
function setupEventListeners() {
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.blockSelect.addEventListener('change', (e) => {
        if (e.target.value) {
            loadBlock(e.target.value);
        } else {
            showEmptyState();
        }
    });
    
    elements.btnPrev.addEventListener('click', () => {
        if (state.currentIndex > 0) {
            state.currentIndex--;
            renderQuestion();
        }
    });
    
    elements.btnNext.addEventListener('click', () => {
        if (state.currentIndex < state.questions.length - 1) {
            state.currentIndex++;
            renderQuestion();
        }
    });
    
    elements.btnReport.addEventListener('click', openReportModal);
    elements.closeModal.addEventListener('click', () => {
        elements.reportModal.classList.add('hidden');
    });
}

// Report Modal Logic
async function openReportModal() {
    elements.reportModal.classList.remove('hidden');
    elements.statsContainer.innerHTML = '<div class="loading-container"><div class="spinner"></div><p>Memuat Report...</p></div>';
    
    try {
        const res = await fetch(`${DATA_URL}/stats.json`);
        const stats = await res.json();
        
        let html = `
            <div style="text-align: center; margin-bottom: 2rem;">
                <h3 style="font-size: 2rem; color: var(--accent-primary)">Total Akurasi: ${stats.accuracy}%</h3>
            </div>
        `;
        
        for (const block of stats.blocks) {
            html += `
                <div class="stat-card">
                    <h3 style="margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
                        ${block.block_name}
                        <button class="btn btn-primary" style="font-size: 0.8rem; padding: 0.4rem 0.8rem;" onclick="loadLogs('${block.block_id}', this)">Lihat Validation Log</button>
                    </h3>
                    <div style="text-align: center; font-weight: bold; margin-bottom: 1rem; line-height: 1.6;">
                        ${block.total} SOAL <br>
                        &darr; <br>
                        <span style="color:var(--correct-border)">${block.valid} VALID (PyMuPDF: ${block.pymupdf}, Rescue: ${block.rescue})</span> <br>
                        &darr; <br>
                        <span style="color:#d97706">${block.scan_ulang} SCAN ULANG (Warning / Ambigu)</span> <br>
                        &darr; <br>
                        <span style="color:var(--wrong-border)">${block.null} NULL</span>
                    </div>
                    <div class="stat-grid">
                        <div class="stat-item">
                            <div class="stat-value">${block.with_image}</div>
                            <div class="stat-label">Soal Bergambar</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-value">${block.no_image}</div>
                            <div class="stat-label">Tanpa Gambar</div>
                        </div>
                    </div>
                    <div id="logs-${block.block_id}" class="logs-container hidden" style="margin-top: 1rem; max-height: 400px; overflow-y: auto;"></div>
                </div>
            `;
        }
        
        elements.statsContainer.innerHTML = html;
        
    } catch (e) {
        elements.statsContainer.innerHTML = '<p style="color: red;">Gagal memuat report.</p>';
    }
}

window.loadLogs = async function(blockId, btn) {
    const container = document.getElementById(`logs-${blockId}`);
    if (!container.classList.contains('hidden')) {
        container.classList.add('hidden');
        btn.textContent = 'Lihat Validation Log';
        return;
    }
    
    btn.textContent = 'Sembunyikan Log';
    container.classList.remove('hidden');
    container.innerHTML = 'Memuat log...';
    
    try {
        const res = await fetch(`${DATA_URL}/logs_${blockId}.json`);
        const logs = await res.json();
        
        let html = '<table class="log-table"><thead><tr><th>No</th><th>Status</th><th>Metode</th><th>% Biru</th><th>Tahapan</th><th>Conf</th><th>Kunci</th><th>Gbr</th><th>S.Ulang</th><th>Mult</th><th>Alasan</th></tr></thead><tbody>';
        
        logs.forEach(log => {
            let badgeClass = 'valid';
            if (log.status === 'WARNING') badgeClass = 'warning';
            if (log.status === 'NULL') badgeClass = 'null';
            
            let bluePctStr = (log.blue_percentage !== undefined && log.blue_percentage !== null) ? log.blue_percentage.toFixed(2) + '%' : '-';
            let stagesHtml = (log.validation_stages && log.validation_stages.length > 0) 
                ? '<ul style="margin:0; padding-left:15px; font-size:0.65rem; color: var(--text-secondary);">' + log.validation_stages.map(s => `<li>${s}</li>`).join('') + '</ul>'
                : '-';
            
            html += `
                <tr>
                    <td>${log.number}</td>
                    <td><span class="badge ${badgeClass}">${log.status}</span></td>
                    <td>${log.method}</td>
                    <td>${bluePctStr}</td>
                    <td style="max-width: 200px; overflow-x: auto;">${stagesHtml}</td>
                    <td>${log.confidence_score}%</td>
                    <td>${log.correct_answer || '-'}</td>
                    <td>${log.has_image ? 'Y' : 'T'}</td>
                    <td>${log.is_rescued ? 'Y' : 'T'}</td>
                    <td>${log.is_multiple_answer ? 'Y' : 'T'}</td>
                    <td style="font-size: 0.75rem; color: var(--text-secondary);">${log.reason}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        container.innerHTML = html;
        
    } catch (e) {
        container.innerHTML = 'Gagal memuat log.';
    }
}

// API Calls
async function fetchBlocks() {
    try {
        const res = await fetch(`${DATA_URL}/blocks.json`);
        if (!res.ok) throw new Error('Failed to fetch blocks');
        const blocks = await res.json();
        state.blocks = blocks;
        
        elements.blockSelect.innerHTML = '<option value="">Pilih Blok Soal</option>';
        blocks.forEach(b => {
            const opt = document.createElement('option');
            opt.value = b.id;
            opt.textContent = b.name;
            elements.blockSelect.appendChild(opt);
        });
    } catch (err) {
        console.error(err);
        alert('Gagal memuat daftar blok soal.');
    }
}

async function loadBlock(blockId) {
    state.currentBlock = blockId;
    showLoading();
    
    try {
        const res = await fetch(`${DATA_URL}/questions_${blockId}.json`);
        if (!res.ok) throw new Error('Failed to fetch questions');
        const rawQuestions = await res.json();
        
        // Filter out completely empty ghost questions (no text, no image, no options)
        state.questions = rawQuestions.filter(q => {
            const hasText = q.text && q.text.trim().length > 0;
            const hasImage = q.image !== null;
            const hasOptions = q.options && q.options.length > 0;
            return hasText || hasImage || hasOptions;
        });
        state.currentIndex = 0;
        state.answers = {};
        
        if (state.questions.length > 0) {
            renderQuestion();
            showQuiz();
        } else {
            alert('Tidak ada soal pada blok ini.');
            showEmptyState();
        }
    } catch (err) {
        console.error(err);
        alert('Gagal memuat soal.');
        showEmptyState();
    }
}

// UI State Managers
function showLoading() {
    elements.emptyState.classList.add('hidden');
    elements.quizContainer.classList.add('hidden');
    elements.loading.classList.remove('hidden');
}

function showEmptyState() {
    elements.loading.classList.add('hidden');
    elements.quizContainer.classList.add('hidden');
    elements.emptyState.classList.remove('hidden');
}

function showQuiz() {
    elements.loading.classList.add('hidden');
    elements.emptyState.classList.add('hidden');
    elements.quizContainer.classList.remove('hidden');
}

// Render Logic
function renderQuestion() {
    const q = state.questions[state.currentIndex];
    const total = state.questions.length;
    const progress = Math.round(((state.currentIndex + 1) / total) * 100);
    
    // Update Progress
    elements.questionCounter.textContent = `Soal ${state.currentIndex + 1} dari ${total}`;
    elements.progressPercentage.textContent = `${progress}%`;
    elements.progressBar.style.width = `${progress}%`;
    
    // Update Question Content
    elements.questionNumber.textContent = `Soal ${state.currentIndex + 1}`;
    if (q.text && q.text.trim().length > 0) {
        elements.questionText.textContent = q.text;
    } else {
        elements.questionText.innerHTML = '<em style="color: var(--text-secondary); opacity: 0.6;">Teks soal tidak tersedia (lihat gambar jika ada)</em>';
    }
    
    // Handle Image
    if (q.image) {
        elements.questionImage.src = `images/${q.image}`;
        elements.questionImageContainer.classList.remove('hidden');
    } else {
        elements.questionImage.src = '';
        elements.questionImageContainer.classList.add('hidden');
    }
    
    // Reset Feedback
    elements.feedbackContainer.classList.add('hidden');
    elements.feedbackContainer.className = 'feedback-container hidden';
    
    // Render Options
    elements.optionsContainer.innerHTML = '';
    const correctAnswer = q.correct_answer ? q.correct_answer.toLowerCase() : null;
    
    // Check if question has no options (empty options = user can't answer, would get stuck)
    const hasNoOptions = !q.options || q.options.length === 0;
    
    if (hasNoOptions) {
        const noOptionsHTML = `
            <div style="background: var(--surface); border: 1px dashed var(--border-color); border-radius: 12px; padding: 2rem; text-align: center; color: var(--text-secondary); margin-top: 1rem;">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom: 1rem; opacity: 0.5;">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10 9 9 9 8 9"></polyline>
                </svg>
                <div style="font-weight: 500; margin-bottom: 0.5rem; color: var(--text-primary);">Opsi Jawaban Tidak Tersedia</div>
                <div style="font-size: 0.9rem;">Sistem tidak mendeteksi adanya pilihan ganda untuk soal ini dari data asli. Silakan catat jawaban Anda secara mandiri atau lewati soal ini.</div>
            </div>
        `;
        elements.optionsContainer.innerHTML = noOptionsHTML;
        
        // Auto-show next button so user isn't stuck
        elements.btnNext.classList.remove('hidden');
    } else {
        q.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'option-btn';
            
            // In Reading Mode, automatically highlight the correct answer
            if (correctAnswer !== null && opt.letter.toLowerCase() === correctAnswer) {
                btn.classList.add('correct');
            }
            
            // Make button look non-interactive since we're just reading
            btn.style.cursor = 'default';
            btn.style.pointerEvents = 'none';
            
            btn.innerHTML = `
                <span class="option-letter">${opt.letter}</span>
                <span class="option-text">${opt.text}</span>
            `;
            
            elements.optionsContainer.appendChild(btn);
        });
    }
    
    // Update Navigation
    elements.btnPrev.disabled = state.currentIndex === 0;
    
    if (hasNoOptions) {
        // Questions with no options
        elements.btnNext.classList.remove('hidden');
        elements.btnNext.disabled = state.currentIndex >= state.questions.length - 1;
    } else {
        // In reading mode, next button is always visible
        elements.btnNext.classList.remove('hidden');
        elements.btnNext.disabled = state.currentIndex >= state.questions.length - 1;
    }
}

function handleAnswer(questionId, selectedLetter, correctLetter) {
    state.answers[questionId] = selectedLetter;
    renderQuestion(); // Re-render to show colors and lock options
}

function showFeedback(isCorrect, correctLetter) {
    elements.feedbackContainer.classList.remove('hidden');
    if (correctLetter === null) {
        elements.feedbackContainer.classList.add('null-feedback');
        elements.feedbackMessage.textContent = 'JAWABAN TERSIMPAN (Kunci jawaban tidak tersedia untuk soal ini)';
    } else if (isCorrect) {
        elements.feedbackContainer.classList.add('correct');
        elements.feedbackMessage.textContent = 'JAWABAN ANDA BENAR';
    } else {
        elements.feedbackContainer.classList.add('wrong');
        elements.feedbackMessage.textContent = `JAWABAN YANG BENAR ADALAH ${correctLetter.toUpperCase()}`;
    }
}

// Start app
document.addEventListener('DOMContentLoaded', init);
