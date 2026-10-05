// File: js/recipients.js

const RecipientsManager = {
    recipients: [],

    init: function() {
        this.setupEventListeners();
        this.renderTable();
    },

    setupEventListeners: function() {
        document.getElementById('addSingleRowBtn').addEventListener('click', () => {
            this.recipients.push({ sapaan: "", nama: "" });
            this.renderTable();
        });

        document.getElementById('clearAllRowsBtn').addEventListener('click', () => {
            if (confirm("Hapus semua nama?")) {
                this.recipients = [];
                this.renderTable();
            }
        });

        document.getElementById('addBulkBtn').addEventListener('click', () => {
            const text = document.getElementById('bulkTextInput').value;
            const lines = text.split('\n');
            const newNames = lines.map(line => ({ nama: line.trim() })).filter(item => item.nama !== '');
            if (newNames.length > 0) {
                this.cleanDataAndAdd(newNames);
                document.getElementById('bulkTextInput').value = '';
            }
        });

        document.getElementById('excelFileInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (evt) => {
                const data = new Uint8Array(evt.target.result);
                try {
                    const workbook = XLSX.read(data, {type: 'array'});
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    const json = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
                    
                    const newNames = [];
                    json.forEach(row => {
                        let namaKey = Object.keys(row).find(k => k.toLowerCase().trim() === 'nama');
                        let sapaanKey = Object.keys(row).find(k => k.toLowerCase().trim() === 'sapaan');
                        
                        if (namaKey || row[Object.keys(row)[0]]) {
                            const namaVal = namaKey ? row[namaKey] : row[Object.keys(row)[0]]; 
                            const sapaanVal = sapaanKey ? row[sapaanKey] : '';
                            
                            if (namaVal && String(namaVal).trim() !== '') {
                                newNames.push({
                                    sapaan: String(sapaanVal).trim(),
                                    nama: String(namaVal).trim()
                                });
                            }
                        }
                    });
                    
                    if (newNames.length > 0) {
                        this.cleanDataAndAdd(newNames);
                        e.target.value = ''; 
                    } else {
                        alert("Tidak ditemukan data nama. Pastikan ada kolom berjudul 'nama'.");
                    }
                } catch (err) {
                    alert("Gagal membaca file Excel/CSV.");
                }
            };
            reader.readAsArrayBuffer(file);
        });

        document.getElementById('downloadExcelSample').addEventListener('click', (e) => {
            e.preventDefault();
            const ws_data = [
                ["sapaan", "nama"],
                ["Bapak", "Budi Santoso"],
                ["", "Siti Aminah, S.E."]
            ];
            const ws = XLSX.utils.aoa_to_sheet(ws_data);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, "Penerima");
            XLSX.writeFile(wb, "Template_Penerima.xlsx");
        });

        // Event delegation for table inputs
        document.getElementById('recipientTbody').addEventListener('input', (e) => {
            if (e.target.classList.contains('input-sapaan') || e.target.classList.contains('input-nama')) {
                const index = parseInt(e.target.dataset.index);
                if (e.target.classList.contains('input-sapaan')) {
                    this.recipients[index].sapaan = e.target.value;
                } else {
                    this.recipients[index].nama = e.target.value;
                }
            }
        });

        document.getElementById('recipientTbody').addEventListener('click', (e) => {
            if (e.target.classList.contains('btn-delete-row')) {
                const index = parseInt(e.target.dataset.index);
                this.recipients.splice(index, 1);
                this.renderTable();
            }
        });
    },

    cleanDataAndAdd: function(newNames) {
        let addedCount = 0;
        let dupCount = 0;
        
        const existingNames = new Set(this.recipients.map(r => r.nama.toLowerCase().trim()).filter(n => n));

        newNames.forEach(item => {
            const nama = (item.nama || '').trim();
            if (!nama) return; 
            
            const lowerNama = nama.toLowerCase();
            if (existingNames.has(lowerNama)) {
                dupCount++;
            } else {
                existingNames.add(lowerNama);
                this.recipients.push({
                    sapaan: item.sapaan || '',
                    nama: nama
                });
                addedCount++;
            }
        });

        const warningEl = document.getElementById('duplicateWarning');
        if (dupCount > 0) {
            warningEl.textContent = `Ditemukan ${dupCount} nama duplikat yang otomatis diabaikan. Menambah ${addedCount} nama baru.`;
            warningEl.style.display = 'block';
            setTimeout(() => { warningEl.style.display = 'none'; }, 5000);
        } else {
            warningEl.style.display = 'none';
        }

        this.renderTable();
    },

    renderTable: function() {
        const tbody = document.getElementById('recipientTbody');
        tbody.innerHTML = '';

        this.recipients.forEach((rec, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td class="col-no">${index + 1}</td>
                <td><input type="text" class="form-input input-sapaan" data-index="${index}" value="${rec.sapaan || ''}" placeholder="Bpk/Ibu"></td>
                <td><input type="text" class="form-input input-nama" data-index="${index}" value="${rec.nama || ''}" placeholder="Nama"></td>
                <td class="col-action"><button class="btn btn-sm btn-danger btn-delete-row" data-index="${index}">Hapus</button></td>
            `;
            tbody.appendChild(tr);
        });

        document.getElementById('totalRecipients').textContent = this.recipients.length;
        
        if (typeof App !== 'undefined') {
            App.updateStep3Count();
        }
    },

    getValidRecipients: function() {
        return this.recipients.filter(r => r.nama && r.nama.trim() !== '');
    }
};
