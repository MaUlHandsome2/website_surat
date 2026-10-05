// File: js/app.js

const App = {
    currentStep: 1,
    fileType: null, // 'docx' or 'pdf'
    targetName: null,
    
    init: function() {
        this.setupNavigation();
        this.setupThemeToggle();
        this.setupStep1Listeners();
        
        RecipientsManager.init();
        ExportManager.setupListeners();
    },

    setupNavigation: function() {
        const goToStep = (step) => {
            if (step < 1 || step > 3) return;
            
            document.querySelectorAll('.step-content').forEach(el => el.classList.remove('active'));
            document.getElementById(`step${step}`).classList.add('active');
            
            document.querySelectorAll('.step').forEach((el, index) => {
                el.classList.remove('active', 'completed');
                if (index + 1 === step) {
                    el.classList.add('active');
                } else if (index + 1 < step) {
                    el.classList.add('completed');
                }
            });

            this.currentStep = step;
            
            if (step === 3) {
                this.updateStep3Preview();
            }
        };

        document.getElementById('nextToStep2').addEventListener('click', () => goToStep(2));
        document.getElementById('nextToStep3').addEventListener('click', () => {
            if (RecipientsManager.getValidRecipients().length > 0) goToStep(3);
            else alert("Mohon masukkan minimal 1 penerima.");
        });
        document.getElementById('backToStep1').addEventListener('click', () => goToStep(1));
        document.getElementById('backToStep2').addEventListener('click', () => goToStep(2));
        
        document.getElementById('step1-nav').addEventListener('click', () => goToStep(1));
        document.getElementById('step2-nav').addEventListener('click', () => {
            if (!document.getElementById('nextToStep2').disabled) goToStep(2);
        });
        document.getElementById('step3-nav').addEventListener('click', () => {
            if (RecipientsManager.getValidRecipients().length > 0) goToStep(3);
        });
    },

    setupThemeToggle: function() {
        const btn = document.getElementById('themeToggleBtn');
        btn.addEventListener('click', () => {
            const html = document.documentElement;
            if (html.getAttribute('data-theme') === 'light') {
                html.setAttribute('data-theme', 'dark');
                btn.textContent = '☀️ Terang';
            } else {
                html.setAttribute('data-theme', 'light');
                btn.textContent = '🌙 Gelap';
            }
        });
    },

    setupStep1Listeners: function() {
        const fileInput = document.getElementById('mainFileInput');
        
        fileInput.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            document.getElementById('fileNameDisplay').textContent = "Memuat: " + file.name;
            const ext = file.name.split('.').pop().toLowerCase();
            
            if (ext === 'docx' || ext === 'pdf') {
                this.fileType = ext;
                
                const arrayBuffer = await file.arrayBuffer();
                let isLoaded = false;
                
                if (ext === 'docx') {
                    isLoaded = DocxProcessor.load(arrayBuffer);
                } else {
                    isLoaded = await PdfProcessor.load(arrayBuffer);
                }
                
                if (isLoaded) {
                    document.getElementById('fileNameDisplay').textContent = file.name;
                    document.getElementById('loadedFileName').textContent = file.name;
                    document.getElementById('fileConfigArea').style.display = 'block';
                    
                    // Reset deteksi
                    this.setTargetName(null, 0);
                    document.getElementById('manualNameInput').value = '';
                } else {
                    alert("Gagal membaca isi file. Pastikan file tidak rusak.");
                }
            } else {
                alert("Format tidak didukung. Harap unggah file .docx atau .pdf");
            }
        });

        document.getElementById('autoDetectBtn').addEventListener('click', async () => {
            if (this.fileType === 'docx') {
                const detected = DocxProcessor.autoDetectTargetName();
                if (detected) {
                    const count = DocxProcessor.countOccurrences(detected);
                    this.setTargetName(detected, count);
                    document.getElementById('manualNameInput').value = detected;
                } else {
                    alert("Tidak dapat menemukan nama target secara otomatis. Silakan ketik secara manual.");
                }
            } else if (this.fileType === 'pdf') {
                alert("Deteksi otomatis pada PDF belum optimal. Harap ketik nama target secara manual.");
            }
        });

        document.getElementById('manualNameInput').addEventListener('input', async (e) => {
            const val = e.target.value.trim();
            if (!val) {
                this.setTargetName(null, 0);
                return;
            }
            
            let count = 0;
            if (this.fileType === 'docx') {
                count = DocxProcessor.countOccurrences(val);
            } else if (this.fileType === 'pdf') {
                count = await PdfProcessor.detectTargetAndCount(val);
            }
            
            this.setTargetName(val, count);
        });
    },

    setTargetName: function(name, count) {
        this.targetName = name;
        const resDiv = document.getElementById('detectionResult');
        const nextBtn = document.getElementById('nextToStep2');
        
        if (name) {
            resDiv.style.display = 'block';
            document.getElementById('targetNameDisplay').textContent = name;
            
            const countEl = document.getElementById('occurrenceCountDisplay');
            if (count > 0) {
                countEl.textContent = `Ditemukan sebanyak ${count} kali dalam dokumen.`;
                countEl.style.color = "var(--success)";
                nextBtn.disabled = false;
                
                document.querySelectorAll('.target-name-highlight').forEach(el => {
                    el.textContent = name;
                });
            } else {
                countEl.textContent = "Tidak ditemukan dalam dokumen! (Cek kembali ejaannya).";
                countEl.style.color = "var(--danger)";
                nextBtn.disabled = true;
            }
        } else {
            resDiv.style.display = 'none';
            nextBtn.disabled = true;
        }
    },

    updateStep3Count: function() {
        const count = RecipientsManager.getValidRecipients().length;
        const el = document.getElementById('finalCount');
        if (el) el.textContent = count;
    },

    updateStep3Preview: function() {
        const validRecipients = RecipientsManager.getValidRecipients();
        const defaultSapaan = document.getElementById('defaultSapaanInput').value;
        const total = validRecipients.length;
        
        if (total === 0) return;
        
        let currentIndex = 0;
        
        const renderPreview = () => {
            const rec = validRecipients[currentIndex];
            const fullNewName = ExportManager.constructFullNewName(rec, defaultSapaan);
            document.getElementById('previewResultName').textContent = fullNewName;
            document.getElementById('previewIndicator').textContent = `Surat ${currentIndex + 1} dari ${total}`;
        };
        
        renderPreview();
        
        document.getElementById('prevPreviewBtn').onclick = () => {
            if (currentIndex > 0) { currentIndex--; renderPreview(); }
        };
        document.getElementById('nextPreviewBtn').onclick = () => {
            if (currentIndex < total - 1) { currentIndex++; renderPreview(); }
        };
        document.getElementById('searchPreviewInput').oninput = (e) => {
            const query = e.target.value.toLowerCase();
            if (!query) return;
            const index = validRecipients.findIndex(r => r.nama.toLowerCase().includes(query));
            if (index !== -1) {
                currentIndex = index;
                renderPreview();
            }
        };
    }
};

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
