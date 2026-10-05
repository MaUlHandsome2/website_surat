// File: js/docx-processor.js

const DocxProcessor = {
    zip: null,
    documentXmlStr: "",
    headerXmlStrs: [],
    footerXmlStrs: [],
    
    // Memuat file DOCX dan menyiapkan XML-nya
    load: function(arrayBuffer) {
        try {
            this.zip = new PizZip(arrayBuffer);
            this.documentXmlStr = this.zip.file("word/document.xml").asText();
            
            // Baca header dan footer jika ada
            this.headerXmlStrs = [];
            this.footerXmlStrs = [];
            
            const files = this.zip.file(/word\/(header|footer)\d+\.xml/);
            files.forEach(file => {
                if (file.name.includes('header')) {
                    this.headerXmlStrs.push({ name: file.name, content: file.asText() });
                } else {
                    this.footerXmlStrs.push({ name: file.name, content: file.asText() });
                }
            });
            
            return true;
        } catch (e) {
            console.error("Gagal memuat DOCX:", e);
            return false;
        }
    },

    // Mengekstrak semua teks untuk auto-detect
    getFullText: function() {
        if (!this.documentXmlStr) return "";
        const parser = new DOMParser();
        const doc = parser.parseFromString(this.documentXmlStr, "application/xml");
        const paragraphs = doc.getElementsByTagName("w:p");
        
        let fullText = "";
        for (let i = 0; i < paragraphs.length; i++) {
            let pText = "";
            const texts = paragraphs[i].getElementsByTagName("w:t");
            for (let j = 0; j < texts.length; j++) {
                pText += texts[j].textContent;
            }
            if (pText) fullText += pText + "\n";
        }
        return fullText;
    },

    // Mencari calon nama setelah "Yth." atau "Kepada"
    autoDetectTargetName: function() {
        const text = this.getFullText();
        const lines = text.split('\n');
        
        for (let line of lines) {
            line = line.trim();
            // Cari pola Yth. [Nama]
            const ythMatch = line.match(/Yth\.?\s+(.+)/i);
            if (ythMatch && ythMatch[1].trim() !== '') {
                return ythMatch[1].trim();
            }
            // Cari pola Kepada [Nama]
            const kepadaMatch = line.match(/Kepada\s+(.+)/i);
            if (kepadaMatch && kepadaMatch[1].trim() !== '' && !kepadaMatch[1].toLowerCase().includes('yth')) {
                return kepadaMatch[1].trim();
            }
        }
        return null;
    },

    // Menghitung kemunculan (sederhana)
    countOccurrences: function(targetName) {
        if (!targetName) return 0;
        let count = 0;
        
        const countInXml = (xmlStr) => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(xmlStr, "application/xml");
            const paragraphs = doc.getElementsByTagName("w:p");
            
            for (let i = 0; i < paragraphs.length; i++) {
                let pText = "";
                const texts = paragraphs[i].getElementsByTagName("w:t");
                for (let j = 0; j < texts.length; j++) {
                    pText += texts[j].textContent;
                }
                
                // Count substring
                let pos = pText.indexOf(targetName);
                while (pos !== -1) {
                    count++;
                    pos = pText.indexOf(targetName, pos + targetName.length);
                }
            }
        };

        countInXml(this.documentXmlStr);
        this.headerXmlStrs.forEach(h => countInXml(h.content));
        this.footerXmlStrs.forEach(f => countInXml(f.content));
        
        return count;
    },

    // Escape karakter XML agar tidak merusak DOCX
    escapeXml: function(unsafe) {
        if (!unsafe) return "";
        return unsafe.replace(/[<>&'"]/g, function (c) {
            switch (c) {
                case '<': return '&lt;';
                case '>': return '&gt;';
                case '&': return '&amp;';
                case '\'': return '&apos;';
                case '"': return '&quot;';
            }
        });
    },

    // Fungsi utama mengganti teks di dalam dokumen XML dengan menangani split runs
    replaceInXml: function(xmlString, targetName, newName) {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlString, "application/xml");
        const paragraphs = xmlDoc.getElementsByTagName("w:p");

        for (let i = 0; i < paragraphs.length; i++) {
            const p = paragraphs[i];
            const textNodes = Array.from(p.getElementsByTagName("w:t"));
            if (textNodes.length === 0) continue;

            // Dapatkan teks gabungan
            let combinedText = "";
            const nodeInfos = [];
            
            textNodes.forEach(node => {
                const text = node.textContent;
                nodeInfos.push({
                    node: node,
                    start: combinedText.length,
                    end: combinedText.length + text.length,
                    text: text
                });
                combinedText += text;
            });

            let matchIndex = combinedText.indexOf(targetName);
            // Lakukan perulangan jika ada beberapa target di satu paragraf
            while (matchIndex !== -1) {
                const targetStart = matchIndex;
                const targetEnd = targetStart + targetName.length;
                let isReplaced = false;

                // Modifikasi textNode yang mencakup target
                for (let j = 0; j < nodeInfos.length; j++) {
                    const info = nodeInfos[j];
                    
                    // Apakah node ini bersentuhan dengan target?
                    if (info.end > targetStart && info.start < targetEnd) {
                        let newContent = "";
                        
                        // Jika ini node pertama yang terkena target, masukkan prefix dan nama baru
                        if (!isReplaced) {
                            // Bagian dari node ini yang ada SEBELUM target (jika ada)
                            if (info.start < targetStart) {
                                newContent += info.text.substring(0, targetStart - info.start);
                            }
                            // Masukkan nama baru (di-escape)
                            newContent += this.escapeXml(newName);
                            // Bagian dari node ini yang ada SETELAH target (jika target berakhir di node ini)
                            if (info.end > targetEnd) {
                                newContent += info.text.substring(targetEnd - info.start);
                            }
                            isReplaced = true;
                        } else {
                            // Node berikutnya yang tertimpa target.
                            // Kita hanya menyimpan sisa teks setelah target (jika ada)
                            if (info.end > targetEnd) {
                                newContent = info.text.substring(targetEnd - info.start);
                            }
                        }
                        
                        // Perbarui teks di XML document
                        info.node.textContent = newContent;
                        // Perbarui object tracking agar jika ada kemunculan ke-2 di paragraf yang sama tidak rusak (walau jarang)
                        info.text = newContent; 
                    }
                }
                
                // Regenerate combined text untuk next match di paragraf yang sama (jika ada)
                combinedText = textNodes.map(n => n.textContent).join('');
                // Cari index selanjutnya setelah target yang baru diganti
                const searchStart = combinedText.indexOf(newName) + newName.length;
                matchIndex = combinedText.indexOf(targetName, searchStart);
            }
        }
        
        const serializer = new XMLSerializer();
        return serializer.serializeToString(xmlDoc);
    },

    // Menghasilkan Blob file docx baru
    generateDocx: function(targetName, newName) {
        if (!this.zip) return null;
        
        // Buat clone dari zip agar tidak merusak state asli
        const zipClone = new PizZip(this.zip.generate({type: "arraybuffer"}));
        
        // Replace di document.xml
        const newDocXml = this.replaceInXml(this.documentXmlStr, targetName, newName);
        zipClone.file("word/document.xml", newDocXml);
        
        // Replace di headers
        this.headerXmlStrs.forEach(h => {
            const newHeader = this.replaceInXml(h.content, targetName, newName);
            zipClone.file(h.name, newHeader);
        });
        
        // Replace di footers
        this.footerXmlStrs.forEach(f => {
            const newFooter = this.replaceInXml(f.content, targetName, newName);
            zipClone.file(f.name, newFooter);
        });
        
        return zipClone.generate({
            type: "blob",
            mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        });
    }
};
