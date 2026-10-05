// File: js/export.js

const ExportManager = {
    isCancelled: false,

    setupListeners: function() {
        document.getElementById('exportZipBtn').addEventListener('click', () => this.startExport('zip'));
        document.getElementById('exportCombinedBtn').addEventListener('click', () => this.startExport('combined'));
        document.getElementById('cancelExportBtn').addEventListener('click', () => {
            this.isCancelled = true;
        });
    },

    showProgress: function(text, percent) {
        const container = document.getElementById('exportProgress');
        const textEl = document.getElementById('progressText');
        const fillEl = document.getElementById('progressFill');
        
        container.style.display = 'block';
        textEl.textContent = text;
        fillEl.style.width = percent + '%';
        
        if (percent >= 100 || this.isCancelled) {
            setTimeout(() => { container.style.display = 'none'; }, 2000);
        }
    },

    sanitizeFileName: function(name) {
        return name.replace(/[\\/:"*?<>|]+/g, '').trim();
    },

    constructFullNewName: function(recipient, defaultSapaan) {
        let prefix = recipient.sapaan ? recipient.sapaan.trim() : defaultSapaan.trim();
        if (prefix) return prefix + " " + recipient.nama;
        return recipient.nama;
    },

    startExport: async function(mode) {
        this.isCancelled = false;
        const validRecipients = RecipientsManager.getValidRecipients();
        const targetName = App.targetName;
        const defaultSapaan = document.getElementById('defaultSapaanInput').value;

        if (validRecipients.length === 0 || !targetName) {
            alert("Data tidak lengkap."); return;
        }

        const total = validRecipients.length;
        this.showProgress("Memulai...", 0);

        if (mode === 'zip') {
            await this.exportZip(validRecipients, targetName, defaultSapaan, total);
        } else {
            await this.exportCombined(validRecipients, targetName, defaultSapaan, total);
        }
    },

    exportZip: async function(recipients, targetName, defaultSapaan, total) {
        const zip = new JSZip();
        
        for (let i = 0; i < total; i++) {
            if (this.isCancelled) {
                this.showProgress("Dibatalkan.", 0); return;
            }
            
            const rec = recipients[i];
            const fullNewName = this.constructFullNewName(rec, defaultSapaan);
            const safeName = this.sanitizeFileName(rec.nama);
            
            let blob = null;
            let extension = "docx";
            
            if (App.fileType === 'docx') {
                blob = DocxProcessor.generateDocx(targetName, fullNewName);
            } else if (App.fileType === 'pdf') {
                blob = await PdfProcessor.generatePdf(targetName, fullNewName);
                extension = "pdf";
            }
            
            if (blob) {
                zip.file(`Undangan_${safeName}.${extension}`, blob);
            }
            
            this.showProgress(`Memproses ${i+1}/${total}...`, Math.round(((i+1)/total)*80));
            // Beri waktu bagi browser untuk render UI agar tidak hang
            await new Promise(r => setTimeout(r, 10)); 
        }

        this.showProgress("Mengompresi file ZIP...", 90);
        const content = await zip.generateAsync({type:"blob"});
        saveAs(content, "Undangan_Terpisah.zip");
        this.showProgress("Selesai!", 100);
    },

    exportCombined: async function(recipients, targetName, defaultSapaan, total) {
        if (App.fileType === 'docx') {
            // Untuk DOCX, menggabungkan banyak dokumen menjadi satu sangat kompleks
            // (harus menangani styles, rels, numberings, header/footer per page).
            // Karena ini murni browser dan tanpa template docxtemplater khusus,
            // kita arahkan pengguna ke mode ZIP.
            alert("Pembuatan file DOCX gabungan kompleks untuk format bebas. Silakan gunakan opsi Unduh File ZIP untuk hasil yang 100% rapi per penerima.");
            this.showProgress("Dibatalkan.", 0);
            return;
        } else if (App.fileType === 'pdf') {
            this.showProgress("Menyiapkan PDF Gabungan...", 10);
            try {
                // Buat dokumen PDF baru (kosong)
                const mergedPdf = await PDFLib.PDFDocument.create();
                
                for (let i = 0; i < total; i++) {
                    if (this.isCancelled) {
                        this.showProgress("Dibatalkan.", 0); return;
                    }
                    
                    const rec = recipients[i];
                    const fullNewName = this.constructFullNewName(rec, defaultSapaan);
                    
                    // Generate single PDF blob
                    const blob = await PdfProcessor.generatePdf(targetName, fullNewName);
                    
                    // Load that blob back to PDFLib
                    const arrayBuffer = await blob.arrayBuffer();
                    const singleDoc = await PDFLib.PDFDocument.load(arrayBuffer);
                    
                    // Copy all pages from singleDoc to mergedPdf
                    const copiedPages = await mergedPdf.copyPages(singleDoc, singleDoc.getPageIndices());
                    copiedPages.forEach((page) => mergedPdf.addPage(page));
                    
                    this.showProgress(`Menggabungkan ${i+1}/${total}...`, 10 + Math.round(((i+1)/total)*80));
                    await new Promise(r => setTimeout(r, 10));
                }
                
                this.showProgress("Menyimpan PDF...", 95);
                const mergedPdfBytes = await mergedPdf.save();
                const blob = new Blob([mergedPdfBytes], { type: "application/pdf" });
                saveAs(blob, "Undangan_Gabungan.pdf");
                this.showProgress("Selesai!", 100);
                
            } catch (e) {
                console.error(e);
                alert("Gagal menggabungkan PDF.");
                this.showProgress("Gagal", 0);
            }
        }
    }
};
