class DentalDetection {
    constructor() {
        console.log('Initializing DentalDetectionApp...');

        this.canvas = null;
        this.ctx = null;
        this.originalImage = null;
        this.detectionData = null;
        this.labelData = [];
        this.selectedLabels = new Set();
        this.labelColors = {};
        this.zoomLevel = 1;
        this.axios = window.axios;
        this.countSpeed = 50;
        this.baseColors = [
            '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7',
            '#DDA0DD', '#98D8C8', '#F7DC6F', '#BB8FCE', '#85C1E9',
            '#F8C471', '#82E0AA', '#F1948A', '#85C1E9', '#D7BDE2'
        ];
        try {
            this.initializeElements();
            this.setupEventListeners();
            this.counterAnimation();
            console.log('initialized successfully');
        } catch (error) {
            console.error('Initialization error:', error);
        }
    }


    initializeElements() {
        this.scroll();
        //counter
        this.counters = document.querySelectorAll('.stat-number');

        // Upload elements
        this.uploadArea = document.getElementById('uploadArea');
        this.fileInput = document.getElementById('fileInput');
        this.uploadBtn = document.getElementById('uploadBtn');
        this.analyzeBtn = document.getElementById('analyzeBtn');
        this.loader = document.getElementById('loader');
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

        // Status and loading
        this.statusMessage = document.getElementById('statusMessage');
        this.loadingOverlay = document.getElementById('loadingOverlay');
        this.progressBar = document.getElementById('progressBar');

        // Navigation
        this.mobileMenuBtn = document.getElementById('mobileMenuBtn');
        this.navMenu = document.getElementById('navMenu');
        this.navLinks = document.querySelectorAll('.nav-link');
    }

    setupEventListeners() {
        // File upload events
        this.uploadArea.addEventListener('click', () => this.fileInput.click());
        this.uploadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            this.fileInput.click();
        });
        this.fileInput.addEventListener('change', (e) => this.handleFileSelect({ event: e }));

        // Drag and drop events
        this.uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
        this.uploadArea.addEventListener('dragleave', (e) => this.handleDragLeave(e));
        this.uploadArea.addEventListener('drop', (e) => this.handleDrop(e));

        // Analysis button
        this.analyzeBtn.addEventListener('click', () => this.analyzeImage());

        // Control buttons
        this.showAllBtn.addEventListener('click', () => this.showAllLabels());
        this.hideAllBtn.addEventListener('click', () => this.hideAllLabels());
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


    counterAnimation() {
        const formatter = (label, val) => {
            let value = `${val.toFixed(1)}`;
            if (label == 'accuracy') value += '%';
            else if (label == 'analysisTime') value = `< ${value}s`;
            else if (label == 'classes') value = value + '+';
            return value;
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

    handleDragOver(e) {
        e.preventDefault();
        this.uploadArea.classList.add('dragover');
    }

    handleDragLeave(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');

    }

    handleDrop(e) {
        e.preventDefault();
        this.uploadArea.classList.remove('dragover');

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            handleFileSelect({ file: files[0] });
        }
    }

    handleFileSelect({ event = null, f = null } = {}) {
        let file = f ? f : event?.target.files[0];

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

        const reader = new FileReader();
        reader.onload = (e) => {
            this.originalImage = new Image();
            this.originalImage.onload = () => {
                const maxWidth = 800;
                const maxHeight = 600;

                let { width, height } = this.originalImage;

                if (width > maxWidth || height > maxHeight) {
                    const ratio = Math.min(maxWidth / width, maxHeight / height);
                    width *= ratio;
                    height *= ratio;
                }

                this.canvas.width = width;
                this.canvas.height = height;
                this.canvas.style.width = width + 'px';
                this.canvas.style.height = height + 'px';

                this.ctx.drawImage(this.originalImage, 0, 0, width, height);


            }
            this.originalImage.src = e.target.result;
        }

        reader.readAsDataURL(file);


        this.analyzeBtn.disabled = false;
        this.scroll(this.analyzeBtn, 'center')
        this.showStatus('File selected successfully', 'info');

    }

    async analyzeImage() {
        this.labelList.innerHTML = '';
        this.treatmentList.innerHTML = '';


        if (this.originalImage == null) {
            this.showStatus('Please select an image first', 'error');
            return;
        }
        console.log('Analyzing image...');
        this.setLoadingState(true);
        this.showLoadingOverlay(true);

        const result = await this.PredictDisease(this.originalImage);
        if (!result) return;

        document.querySelector('.results').style.display = 'block';

        this.detectionData = result;
        console.log('Detection data:', this.detectionData);
        this.labelData = result.labels;
        this.drawDetections();
        let divData = this.drawLabels();
        divData.forEach(({ id, labelCol, name, confidence }) => {
            this.getLabelDiv({
                id: id,
                labelCol: labelCol,
                name: name,
                confidence: confidence
            })
        })

        let seen = new Set();
        this.treatmentList.innerHTML = result.labels.map(label => {
            let { title, description } = label.treatment;
            if (seen.has(title)) {
                return '';
            }
            seen.add(title);
            return `<li class="treatment-item">
                <h4>${title}</h4>
                <p>${description}</p>
            </li>`;
        }).join('');

        this.scroll(this.resultsSection);
        this.setLoadingState(false);
        this.showLoadingOverlay(false);

    }


    async PredictDisease(img) {
        try {
            // const res = await this.axios.post('https://e3d22fde4cd4.ngrok-free.app/predict', {
            const res = await this.axios.post('http://127.0.0.1:5000/predict', {
                image: img.src
            }, {
                headers: {
                    'Content-Type': 'application/json',
                    'Ngrok-Skip-Browser-Warning': '1'
                }
            }
            );
            if (res.status !== 200) {
                this.showStatus('Prediction failed', 'error');
                return null;
            }
            return res.data;
        } catch (error) {
            this.showStatus('Error during prediction', 'error');
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

    drawLabels(labels = this.detectionData?.labels) {
        console.log('Drawing labels', labels, labels.length);
        if(!labels || Object.keys(labels).length === 0) {
            return;
        }
        let divData = []
        labels?.forEach(label => {
            let { id, labelCol, name, confidence } = this.addBox(label);
            divData.push({ id, labelCol, name, confidence });
        })
        return divData;
    }

    showAllLabels() {
        document.querySelectorAll('.label-item').forEach(label => {
            label.classList.add('selected');
        })
        this.labelData = this.detectionData.labels.slice(); 
        this.drawDetections();
        this.drawLabels();
    }

    hideAllLabels() {
        document.querySelectorAll('.label-item.selected').forEach(label => {
            label.classList.remove('selected');
        })
        this.labelData = [];
        this.drawDetections();
        this.drawLabels(this.labelData)
    }


    removeLabel(labelId) {
        console.log('Removing label with ID:', labelId);
        document.querySelector(`[data-label-id = "${labelId}"`)?.classList.remove('selected');

        this.labelData = this.labelData.filter(label => label.id != labelId);

        console.log('Label found:',  this.labelData);
        this.drawDetections();
        this.drawLabels( this.labelData);
    }

    addLabel(labelId) {
        console.log('Adding label with ID:', labelId, this.labelData, this.detectionData);
        document.querySelector(`[data-label-id = "${labelId}"`)?.classList.add('selected');

        this.labelData.push(this.detectionData.labels.find(label => label.id == labelId));
        
        console.log('Label found:', this.labelData);

        this.drawLabels(this.labelData);
    }


    addBox(label) {
        // console.log('Adding box for label:', label);
        if (label) {
            const col = this.baseColors[label.classId % this.baseColors.length];
            const textColor = '#000000ff'; // White text for contrast
            const fontSize = 16;
            const font = `${fontSize}px Arial`;
            const padding = 2;

            this.ctx.lineWidth = 3;
            this.ctx.strokeStyle = col;
            this.ctx.font = font;

            const { height, width } = this.canvas;

            let box = label.bbox
            const x = (box.x - box.width / 2) * width;
            const y = (box.y - box.height / 2) * height;
            const w = box.width * width;
            const h = box.height * height;

            // Draw bounding box
            this.ctx.strokeRect(x, y, w, h);

            // Prepare label text
            const labelText = `${label.name}`;
            const textWidth = this.ctx.measureText(labelText).width;

            // Calculate text background box position
            const textX = x;
            const textY = y > fontSize + padding * 2 ? y - fontSize - padding * 2 : y + padding;
            const bgWidth = textWidth + padding * 2;
            const bgHeight = fontSize + padding * 2;

            // Draw text background box
            this.ctx.fillStyle = col;
            this.ctx.fillRect(textX, textY, bgWidth, bgHeight);

            // Draw label text
            this.ctx.fillStyle = textColor;
            this.ctx.fillText(labelText, textX + padding, textY + fontSize + padding / 2);

            return {
                id: label.id,
                labelCol: col,
                name: label.name,
                confidence: label.confidence
            };
        }
    }

    getLabelDiv({ id, labelCol, name, confidence } = {}) {
        let div = document.createElement('div');
        div.className = 'label-item selected';
        div.setAttribute('data-label-id', id);
        div.addEventListener('click', (e) => { this.toggleLabelSelect(e) })
        let labelItem = `
                <div class="label-color" style="background-color: ${labelCol}"></div>
                <span class="label-name">${name}</span>
                <span class="label-confidence">${(confidence * 100).toFixed(1)}%</span>
        `;
        div.innerHTML = labelItem;
        this.labelList.appendChild(div);
        return div;
    }

    toggleLabelSelect(e) {
        let id = e.currentTarget.dataset.labelId;
        if (e.currentTarget.classList.contains('selected')) {
            e.currentTarget.classList.remove('selected');
            this.removeLabel(id);
        } else {
            this.addLabel(id);
        }
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

