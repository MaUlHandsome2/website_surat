// File: js/pdf-processor.js

const PdfProcessor = {
    originalBytes: null,
    targetCoordinates: [], // { pageIndex: 0, x: 100, y: 200, width: 150, height: 12, fontSize: 12 }
    
    // Load PDF file via pdf.js to extract coordinates
    load: async function(arrayBuffer) {
        try {
            this.originalBytes = new Uint8Array(arrayBuffer);
            return true;
        } catch (e) {
            console.error("Gagal memuat PDF", e);
            return false;
        }
    },

    // Ekstrak teks dan hitung posisi kemunculan targetName
    detectTargetAndCount: async function(targetName) {
        if (!this.originalBytes || !targetName) return 0;
        this.targetCoordinates = [];
        let count = 0;

        try {
            const loadingTask = pdfjsLib.getDocument({ data: this.originalBytes });
            const pdfDoc = await loadingTask.promise;
            
            for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
                const page = await pdfDoc.getPage(pageNum);
                const textContent = await page.getTextContent();
                
                // Penggabungan teks seringkali terpisah per huruf di PDF, namun kita asumsikan 
                // blok teks (str) mengandung potongan nama.
                // Pendekatan sederhana: Cari dalam item.str
                // Jika terpotong di item yang berbeda, ini adalah limitasi dari PDF.
                
                let combinedStr = "";
                let itemInfos = [];
                
                for (let i = 0; i < textContent.items.length; i++) {
                    const item = textContent.items[i];
                    combinedStr += item.str;
                    itemInfos.push({
                        str: item.str,
                        transform: item.transform, // [scaleX, skewY, skewX, scaleY, x, y]
                        width: item.width,
                        height: item.height
                    });
                }
                
                // Cari occurrences dalam combined string
                let pos = combinedStr.indexOf(targetName);
                while (pos !== -1) {
                    count++;
                    
                    // Temukan item mana yang mengandung awal dari nama ini
                    let currentLen = 0;
                    for (let j = 0; j < itemInfos.length; j++) {
                        const item = itemInfos[j];
                        if (pos >= currentLen && pos < currentLen + item.str.length) {
                            // Target mulai di item ini
                            const scaleX = item.transform[0];
                            const scaleY = item.transform[3];
                            const x = item.transform[4];
                            const y = item.transform[5];
                            
                            // Estimasi lebar: asumsi proporsional
                            const estimatedWidth = (targetName.length / item.str.length) * item.width;
                            const fontSize = Math.abs(scaleY); // height
                            
                            this.targetCoordinates.push({
                                pageIndex: pageNum - 1,
                                x: x,
                                y: y,
                                width: estimatedWidth || (targetName.length * (fontSize/2)),
                                height: fontSize,
                                fontSize: fontSize
                            });
                            
                            break; // Cukup ambil koordinat awal
                        }
                        currentLen += item.str.length;
                    }
                    
                    pos = combinedStr.indexOf(targetName, pos + targetName.length);
                }
            }
        } catch (e) {
            console.error("Error membaca PDF", e);
        }
        
        return count;
    },

    // Menghasilkan Blob PDF baru
    generatePdf: async function(targetName, newName) {
        if (!this.originalBytes) return null;
        
        try {
            const pdfDoc = await PDFLib.PDFDocument.load(this.originalBytes);
            const pages = pdfDoc.getPages();
            
            // Embed font
            const timesRomanFont = await pdfDoc.embedFont(PDFLib.StandardFonts.TimesRomanBold);
            
            this.targetCoordinates.forEach(coord => {
                if (coord.pageIndex < pages.length) {
                    const page = pages[coord.pageIndex];
                    
                    // Gambar kotak putih untuk menutupi nama lama
                    // Perlu sedikit padding karena bounding box kadang kurang presisi
                    page.drawRectangle({
                        x: coord.x - 2,
                        y: coord.y - 2,
                        width: coord.width + 150, // beri ruang ekstra untuk panjang nama baru jika menimpa
                        height: coord.height + 4,
                        color: PDFLib.rgb(1, 1, 1), // Putih
                    });
                    
                    // Tulis teks baru
                    page.drawText(newName, {
                        x: coord.x,
                        y: coord.y,
                        size: coord.fontSize,
                        font: timesRomanFont,
                        color: PDFLib.rgb(0, 0, 0) // Hitam
                    });
                }
            });
            
            const pdfBytes = await pdfDoc.save();
            return new Blob([pdfBytes], { type: "application/pdf" });
            
        } catch (e) {
            console.error("Gagal modifikasi PDF:", e);
            return null;
        }
    }
};
