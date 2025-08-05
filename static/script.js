class DentalDetection {
    constructor() {
        console.log('Initializing DentalDetectionApp...');

        this.initializeProps();
        try {
            this.initializeElements();
            this.setupEventListeners();
            this.counterAnimation();
            console.log('initialized successfully');
        } catch (error) {
            console.error('Initialization error:', error);
        }
    }

    initializeProps() {
        this.originalImage = null;
        this.detectionData = null;
        this.labelData = [];
        this.selectedLabels = new Set();
        this.zoomLevel = 1;
        this.countSpeed = 50;
        this.baseColors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
            '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
            '#F8C471', '#82E0AA', '#F1948A', '#D7BDE2'
        ];
    }


    initializeElements() {
        //counter
        this.counters = document.querySelectorAll('.stat-number');

        // Upload elements
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.analyzeBtn = document.getElementById('analyzeBtn');
        this.btnText = document.querySelector('.btn-text');

        // Results elements
        this.resultsSection = document.getElementById('resultsSection');
        this.canvas = document.getElementById('imageCanvas');
        this.ctx = this.canvas.getContext('2d');
        this.labelList = document.getElementById('labelList');
        this.treatmentList = document.getElementById('treatmentList');

        // Control elements
        this.showAllBtn = document.getElementById('showAllBtn');
        this.hideAllBtn = document.getElementById('hideAllBtn');
        this.downloadBtn = document.getElementById('downloadBtn');
        this.exportBtn = document.getElementById('exportBtn');

        // Navigation
        this.mobileMenuBtn = document.getElementById('mobileMenuBtn');
        this.navMenu = document.getElementById('navMenu');
        this.navLinks = document.querySelectorAll('.nav-link');
        
        // Status and loading
        this.statusMessage = document.getElementById('statusMessage');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.loader = document.getElementById('loader');

        this.scroll();
    }

    setupEventListeners() {
        // File upload events
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.uploadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.fileInput.click();
        });
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files[0]));

        // Drag and drop events
        this.uploadArea.addEventListener('dragover', (e) => this.toggleDrag(e, true));
        this.uploadArea.addEventListener('dragleave', (e) => this.toggleDrag(e, false));
        this.uploadArea.addEventListener('drop', (e) => {
            e.preventDefault();
            this.toggleDrag(e, false);
            this.handleFileSelect(e.dataTransfer.files[0]);
        });

        // Analysis button
        this.analyzeBtn.addEventListener('click', () => this.analyzeImage());

        // Control buttons
        this.analyzeBtn.addEventListener('click', () => this.analyzeImage());
        this.showAllBtn.addEventListener('click', () => this.toggleAllLabels(true));
        this.hideAllBtn.addEventListener('click', () => this.toggleAllLabels(false));
        this.downloadBtn.addEventListener('click', () => this.downloadImage());
        this.exportBtn.addEventListener('click', () => this.exportReport());

        // Navigation events
        this.mobileMenuBtn.addEventListener('click', () => { this.navMenu.classList.toggle('active'); });

        this.navLinks.forEach((element) => {
            element.addEventListener('click', (e) => {
                document.querySelector('#navMenu .active')?.classList.remove('active');
                e.currentTarget.classList.add('active');
            })
        })

    }

    toggleDrag(e, isOver) {
        e.preventDefault();
        this.uploadArea.classList.toggle('dragover', isOver);
    }

    scroll(element, position = 'start') {
        if (!element) {
            window.scrollTo({
                top: 0,
                behavior: "smooth",
            })
        } else {
            element.scrollIntoView({
                behavior: "smooth",
                block: position
            });
        }
    }


    setLoadingState(isLoading) {
        if (isLoading) {
            this.analyzeBtn.disabled = true;
            this.btnText.textContent = 'Analyzing...';
            this.loader.style.display = 'block';

        } else {
            this.analyzeBtn.disabled = false;
            this.btnText.textContent = 'Analyze with AI';
            this.loader.style.display = 'none';
        }
    }

    showLoadingOverlay(isShow) {
        if (isShow) {
            this.loadingOverlay.classList.add('show');
        } else {
            this.loadingOverlay.classList.remove('show');
        }
    }


    showStatus(message, type = 'info') {
        this.statusMessage.innerText = message;
        this.statusMessage.className = `status-message ${type}`;
        this.statusMessage.style.transform = 'translateX(0)';

        setTimeout(() => {
            this.statusMessage.style.transform = 'translateX(400px)';
        }, 4000);
    }


    counterAnimation() {
        const formatter = (label, val) => {
            if (label == 'accuracy') return `${val.toFixed(1)}%`;
            if (label == 'analysisTime') return `< ${val.toFixed(1)}s`;
            if (label == 'classes') return `${val.toFixed(1)}+`;
            return `${val.toFixed(1)}`;
        }

        this.counters.forEach(counter => {
            let label = counter.getAttribute('data-label');
            const target = parseFloat(counter.innerText.match(/(\d+)/)[0]);
            let current = 0;

            const updateCount = () => {
                const increment = target / this.countSpeed;
                current += increment;

                if (current < target) {
                    counter.innerText = formatter(label, current);
                    requestAnimationFrame(updateCount);
                } else counter.innerText = formatter(label, target);

            };

            updateCount();
        });
    }



    handleFileSelect(file) {
        this.labelList.innerHTML = '';
        this.treatmentList.innerHTML = '';
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        if (!file) {
            this.showStatus('No file selected', 'error');
            return;
        }
        if (!file.type.startsWith('image/')) {
            this.showStatus('file is not an image', 'error');
            return;
        }

        if (file.size > 10 * 1024 * 1024) {
            this.showStatus('File size too large. Please select an image under 10MB', 'error');
            alert('File size too large. Please select an image under 10MB');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            this.originalImage = new Image();
            this.originalImage.onload = () => {
                const maxWidth = 800;
                const maxHeight = 600;

                let { width, height } = this.originalImage;

                const ratio = Math.min(maxWidth / width, maxHeight / height);
                if (ratio < 1) {
                    width *= ratio;
                    height *= ratio;
                }

                this.canvas.width = width;
                this.canvas.height = height;
                this.canvas.style.width = width + 'px';
                this.canvas.style.height = height + 'px';

                this.ctx.drawImage(this.originalImage, 0, 0, width, height);
                this.analyzeBtn.disabled = false;
                this.showStatus('image loaded successfully', 'info');
                this.scroll(this.analyzeBtn, 'center')
            }
            this.originalImage.src = e.target.result;
        }
        reader.readAsDataURL(file);

        let uploadElementContent = `
            <div class="upload-icon" style="transform: scale(1);">
                <i class="fas fa-check-circle" style="color: var(--success-color);"></i>
            </div>
            <h3 style="opacity: 1; transform: translateY(0);">File Selected</h3>
            <p style="opacity: 1; transform: translateY(0);"><strong>${file.name}</strong></p>
            <div class="supported-formats" style="opacity: 1; transform: translateY(0);">
                Size: ${(file.size / 1024 / 1024).toFixed(2)} MB
            </div>
            <button class="upload-btn" id="changeFileBtn" style="opacity: 1; transform: translateY(0);">
                <i class="fas fa-exchange-alt"></i>
                Change File
            </button>
        `;

        this.uploadArea.classList.add('fade-out');
        setTimeout(() => {
            this.uploadArea.innerHTML = uploadElementContent;

            this.uploadArea.classList.remove('fade-out');
            this.uploadArea.classList.add('fade-in');

        }, 300);


    }

    async analyzeImage() {        
        if (this.originalImage == null) {
            this.showStatus('Please select an image first', 'error');
            return;
        }
        console.log('Analyzing image...');

        this.labelList.innerHTML = '';
        this.treatmentList.innerHTML = '';
        this.setLoadingState(true);
        this.showLoadingOverlay(true);

        const result = await this.PredictDisease(this.originalImage);
        if (!result) return;

        
        this.detectionData = result;
        this.labelData = result.labels.slice();
        
        this.drawDetections();
        this.drawLabels(this.labelData);
        this.populateLabelsUI(this.labelData);
        this.populateTreatmentList(this.labelData);
        
        document.querySelector('.results').style.display = 'block';
        this.scroll(this.resultsSection);
        this.setLoadingState(false);
        this.showLoadingOverlay(false);

    }


    async PredictDisease(img) {
        try {
            const response = await fetch('/predict', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    "ngrok-skip-browser-warning": "69420",
                },
                body: JSON.stringify({ image: img.src })
            });

            if (!response.ok) {
                this.showStatus('Prediction failed (Server error)', 'error');
                console.error('Server returned error:', response.status, response.statusText);
                return null;
            }

            const data = await response.json();
            return data;

        } catch (error) {
            this.showStatus('Prediction failed (Network error)', 'error');
            console.error('Network or server error:', error);
            return null;

        } finally {
            this.setLoadingState(false);
            this.showLoadingOverlay(false);
        }
    }



    drawDetections() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.drawImage(this.originalImage, 0, 0, this.canvas.width, this.canvas.height);
    }

    drawLabels(labels = []) {
        labels.forEach(label => this.drawLabelBox(label));
    }

    drawLabelBox(label) {
        const { bbox, name, classId } = label;
        const col = this.baseColors[classId % this.baseColors.length];
        const textColor = '#000';
        const padding = 2;
        const fontSize = 16;
        const font = `${fontSize}px Arial`;
        this.ctx.font = font;
        this.ctx.lineWidth = 3;
        this.ctx.strokeStyle = col;

        const x = (bbox.x - bbox.width / 2) * this.canvas.width;
        const y = (bbox.y - bbox.height / 2) * this.canvas.height;
        const w = bbox.width * this.canvas.width;
        const h = bbox.height * this.canvas.height;

        this.ctx.strokeRect(x, y, w, h);
        const text = `${name}`;
        const textWidth = this.ctx.measureText(text).width;
        const textX = x;
        const textY = y > fontSize + 4 ? y - fontSize - padding : y + padding;

        this.ctx.fillStyle = col;
        this.ctx.fillRect(textX, textY, textWidth + 2 * padding, fontSize + 2 * padding);
        this.ctx.fillStyle = textColor;
        this.ctx.fillText(text, textX + padding, textY + fontSize);
    }

    populateLabelsUI(labels) {
        this.labelList.innerHTML = '';
        labels.forEach(label => {
            const col = this.baseColors[label.classId % this.baseColors.length];
            const div = document.createElement('div');
            div.className = 'label-item selected';
            div.dataset.labelId = label.id;
            div.innerHTML = `
                <div class="label-color" style="background-color: ${col}"></div>
                <span class="label-name">${label.name}</span>
                <span class="label-confidence">${(label.confidence * 100).toFixed(1)}%</span>
            `;
            div.addEventListener('click', () => this.toggleLabelSelection(div, label.id));
            this.labelList.appendChild(div);
        });
    }

    populateTreatmentList(labels) {
        const seen = new Set();
        this.treatmentList.innerHTML = labels
            .map(label => {
                const { title, description } = label.treatment;
                if (seen.has(title)) return '';
                seen.add(title);
                return `<li class="treatment-item"><h4>${title}</h4><p>${description}</p></li>`;
            })
            .join('');
    }

    toggleLabelSelection(div, id) {
        const selected = div.classList.toggle('selected');
        if (selected) {
            const label = this.detectionData.labels.find(l => l.id == id);
            this.labelData.push(label);
        } else {
            this.labelData = this.labelData.filter(l => l.id != id);
        }
        this.drawDetections();
        this.drawLabels(this.labelData);
    }

    toggleAllLabels(show) {
        const method = show ? 'add' : 'remove';
        document.querySelectorAll('.label-item').forEach(el => el.classList[method]('selected'));
        this.labelData = show ? this.detectionData.labels.slice() : [];
        this.drawDetections();
        this.drawLabels(this.labelData);
    }

}



document.addEventListener('DOMContentLoaded', () => {
    try {
        const app = new DentalDetection();
        console.log('Application loaded successfully');
    } catch (error) {
        console.error('Error initializing application:', error);
        // Ensure page is still visible even if there's an error
        document.body.style.opacity = '1';
        document.body.style.visibility = 'visible';

        // Show content without animations
        const allElements = document.querySelectorAll('*');
        allElements.forEach(element => {
            element.style.opacity = '1';
            element.style.visibility = 'visible';
            element.style.transform = 'none';
        });
    }
});

