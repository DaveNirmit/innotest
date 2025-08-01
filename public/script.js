// Global variables
let currentRole = 'admin';
let facultyData = [];
let batchData = [];
let subjectData = [];
let classroomData = [];
let mappingData = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
    loadInitialData();
});

function initializeApp() {
    switchRole('admin');
}

function setupEventListeners() {
    // Role selector
    document.getElementById('roleSelector').addEventListener('change', function(e) {
        switchRole(e.target.value);
    });

    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchTab(tabName);
        });
    });

    // Faculty and Batch selectors
    document.getElementById('facultySelect').addEventListener('change', function(e) {
        if (e.target.value) {
            loadFacultyTimetable(e.target.value);
        }
    });

    document.getElementById('batchSelect').addEventListener('change', function(e) {
        if (e.target.value) {
            loadStudentTimetable(e.target.value);
        }
    });

    // Close modals when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

function switchRole(role) {
    currentRole = role;
    
    // Hide all panels
    document.querySelectorAll('.panel').forEach(panel => {
        panel.classList.remove('active');
    });
    
    // Show selected panel
    const panelId = role + 'Panel';
    document.getElementById(panelId).classList.add('active');
    
    // Update role selector
    document.getElementById('roleSelector').value = role;
    
    // Load role-specific data
    if (role === 'faculty') {
        loadFacultySelector();
    } else if (role === 'student') {
        loadBatchSelector();
    }
}

function switchTab(tabName) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    document.getElementById(tabName + 'Tab').classList.add('active');
    
    // Load tab-specific data
    switch(tabName) {
        case 'faculty':
            loadFaculty();
            break;
        case 'batches':
            loadBatches();
            break;
        case 'subjects':
            loadSubjects();
            break;
        case 'classrooms':
            loadClassrooms();
            break;
        case 'mappings':
            loadMappings();
            loadMappingSelectors();
            break;
    }
}

async function loadInitialData() {
    await Promise.all([
        loadFaculty(),
        loadBatches(),
        loadSubjects(),
        loadClassrooms(),
        loadMappings()
    ]);
}

// API Functions
async function apiCall(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json'
        }
    };
    
    if (data) {
        options.body = JSON.stringify(data);
    }
    
    try {
        const response = await fetch(endpoint, options);
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'API request failed');
        }
        
        return result;
    } catch (error) {
        console.error('API Error:', error);
        showMessage(error.message, 'error');
        throw error;
    }
}

// Faculty Management
async function loadFaculty() {
    try {
        facultyData = await apiCall('/api/faculty');
        updateFacultyTable();
    } catch (error) {
        console.error('Error loading faculty:', error);
    }
}

function updateFacultyTable() {
    const tbody = document.querySelector('#facultyTable tbody');
    tbody.innerHTML = '';
    
    facultyData.forEach(faculty => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${faculty.name}</td>
            <td>${faculty.email || 'N/A'}</td>
            <td>${faculty.phone || 'N/A'}</td>
            <td>${faculty.department || 'N/A'}</td>
            <td>
                <button class="btn btn-danger" onclick="deleteFaculty(${faculty.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function addFaculty(event) {
    event.preventDefault();
    
    const formData = {
        name: document.getElementById('facultyName').value,
        email: document.getElementById('facultyEmail').value,
        phone: document.getElementById('facultyPhone').value,
        department: document.getElementById('facultyDepartment').value
    };
    
    try {
        await apiCall('/api/faculty', 'POST', formData);
        closeModal('facultyModal');
        document.getElementById('facultyForm').reset();
        await loadFaculty();
        showMessage('Faculty added successfully!', 'success');
    } catch (error) {
        console.error('Error adding faculty:', error);
    }
}

// Batch Management
async function loadBatches() {
    try {
        batchData = await apiCall('/api/batches');
        updateBatchTable();
    } catch (error) {
        console.error('Error loading batches:', error);
    }
}

function updateBatchTable() {
    const tbody = document.querySelector('#batchTable tbody');
    tbody.innerHTML = '';
    
    batchData.forEach(batch => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${batch.name}</td>
            <td>${batch.year}</td>
            <td>${batch.semester}</td>
            <td>${batch.student_count}</td>
            <td>
                <button class="btn btn-danger" onclick="deleteBatch(${batch.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function addBatch(event) {
    event.preventDefault();
    
    const formData = {
        name: document.getElementById('batchName').value,
        year: parseInt(document.getElementById('batchYear').value),
        semester: parseInt(document.getElementById('batchSemester').value),
        student_count: parseInt(document.getElementById('batchStudents').value)
    };
    
    try {
        await apiCall('/api/batches', 'POST', formData);
        closeModal('batchModal');
        document.getElementById('batchForm').reset();
        await loadBatches();
        showMessage('Batch added successfully!', 'success');
    } catch (error) {
        console.error('Error adding batch:', error);
    }
}

// Subject Management
async function loadSubjects() {
    try {
        subjectData = await apiCall('/api/subjects');
        updateSubjectTable();
    } catch (error) {
        console.error('Error loading subjects:', error);
    }
}

function updateSubjectTable() {
    const tbody = document.querySelector('#subjectTable tbody');
    tbody.innerHTML = '';
    
    subjectData.forEach(subject => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${subject.name}</td>
            <td>${subject.code}</td>
            <td><span class="badge ${subject.type}">${subject.type}</span></td>
            <td>${subject.credits}</td>
            <td>
                <button class="btn btn-danger" onclick="deleteSubject(${subject.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function addSubject(event) {
    event.preventDefault();
    
    const formData = {
        name: document.getElementById('subjectName').value,
        code: document.getElementById('subjectCode').value,
        type: document.getElementById('subjectType').value,
        credits: parseInt(document.getElementById('subjectCredits').value)
    };
    
    try {
        await apiCall('/api/subjects', 'POST', formData);
        closeModal('subjectModal');
        document.getElementById('subjectForm').reset();
        await loadSubjects();
        showMessage('Subject added successfully!', 'success');
    } catch (error) {
        console.error('Error adding subject:', error);
    }
}

// Classroom Management
async function loadClassrooms() {
    try {
        classroomData = await apiCall('/api/classrooms');
        updateClassroomTable();
    } catch (error) {
        console.error('Error loading classrooms:', error);
    }
}

function updateClassroomTable() {
    const tbody = document.querySelector('#classroomTable tbody');
    tbody.innerHTML = '';
    
    classroomData.forEach(classroom => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${classroom.name}</td>
            <td>${classroom.capacity}</td>
            <td><span class="badge ${classroom.type}">${classroom.type}</span></td>
            <td>${classroom.building || 'N/A'}</td>
            <td>
                <button class="btn btn-danger" onclick="deleteClassroom(${classroom.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

async function addClassroom(event) {
    event.preventDefault();
    
    const formData = {
        name: document.getElementById('classroomName').value,
        capacity: parseInt(document.getElementById('classroomCapacity').value),
        type: document.getElementById('classroomType').value,
        building: document.getElementById('classroomBuilding').value
    };
    
    try {
        await apiCall('/api/classrooms', 'POST', formData);
        closeModal('classroomModal');
        document.getElementById('classroomForm').reset();
        await loadClassrooms();
        showMessage('Classroom added successfully!', 'success');
    } catch (error) {
        console.error('Error adding classroom:', error);
    }
}

// Mapping Management
async function loadMappings() {
    try {
        mappingData = await apiCall('/api/subject-batch');
        updateMappingTable();
    } catch (error) {
        console.error('Error loading mappings:', error);
    }
}

function updateMappingTable() {
    const tbody = document.querySelector('#mappingTable tbody');
    tbody.innerHTML = '';
    
    mappingData.forEach(mapping => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${mapping.subject_name}</td>
            <td>${mapping.code}</td>
            <td><span class="badge ${mapping.type}">${mapping.type}</span></td>
            <td>${mapping.batch_name}</td>
            <td>${mapping.faculty_name}</td>
            <td>
                <button class="btn btn-danger" onclick="deleteMapping(${mapping.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function loadMappingSelectors() {
    // Load subjects
    const subjectSelect = document.getElementById('mappingSubject');
    subjectSelect.innerHTML = '<option value="">Select Subject</option>';
    subjectData.forEach(subject => {
        const option = document.createElement('option');
        option.value = subject.id;
        option.textContent = `${subject.name} (${subject.code})`;
        subjectSelect.appendChild(option);
    });
    
    // Load batches
    const batchSelect = document.getElementById('mappingBatch');
    batchSelect.innerHTML = '<option value="">Select Batch</option>';
    batchData.forEach(batch => {
        const option = document.createElement('option');
        option.value = batch.id;
        option.textContent = batch.name;
        batchSelect.appendChild(option);
    });
    
    // Load faculty
    const facultySelect = document.getElementById('mappingFaculty');
    facultySelect.innerHTML = '<option value="">Select Faculty</option>';
    facultyData.forEach(faculty => {
        const option = document.createElement('option');
        option.value = faculty.id;
        option.textContent = faculty.name;
        facultySelect.appendChild(option);
    });
}

async function addMapping(event) {
    event.preventDefault();
    
    const formData = {
        subject_id: parseInt(document.getElementById('mappingSubject').value),
        batch_id: parseInt(document.getElementById('mappingBatch').value),
        faculty_id: parseInt(document.getElementById('mappingFaculty').value)
    };
    
    try {
        await apiCall('/api/subject-batch', 'POST', formData);
        closeModal('mappingModal');
        document.getElementById('mappingForm').reset();
        await loadMappings();
        showMessage('Subject-Batch mapping added successfully!', 'success');
    } catch (error) {
        console.error('Error adding mapping:', error);
    }
}

// Timetable Generation
async function generateTimetable() {
    const statusDiv = document.getElementById('generateStatus');
    statusDiv.innerHTML = '<div class="status-message loading">🔄 Generating timetable... This may take a few moments.</div>';
    
    try {
        await apiCall('/api/generate-timetable', 'POST');
        statusDiv.innerHTML = '<div class="status-message success">✅ Timetable generated successfully! Switch to Faculty or Student view to see the results.</div>';
    } catch (error) {
        statusDiv.innerHTML = '<div class="status-message error">❌ Error generating timetable. Please try again.</div>';
        console.error('Error generating timetable:', error);
    }
}

// Faculty Timetable
function loadFacultySelector() {
    const facultySelect = document.getElementById('facultySelect');
    facultySelect.innerHTML = '<option value="">Select Faculty</option>';
    
    facultyData.forEach(faculty => {
        const option = document.createElement('option');
        option.value = faculty.id;
        option.textContent = faculty.name;
        facultySelect.appendChild(option);
    });
}

async function loadFacultyTimetable(facultyId) {
    try {
        const timetableData = await apiCall(`/api/timetable?faculty_id=${facultyId}`);
        displayTimetable(timetableData, 'facultyTimetable');
    } catch (error) {
        console.error('Error loading faculty timetable:', error);
    }
}

// Student Timetable
function loadBatchSelector() {
    const batchSelect = document.getElementById('batchSelect');
    batchSelect.innerHTML = '<option value="">Select Batch</option>';
    
    batchData.forEach(batch => {
        const option = document.createElement('option');
        option.value = batch.id;
        option.textContent = batch.name;
        batchSelect.appendChild(option);
    });
}

async function loadStudentTimetable(batchId) {
    try {
        const timetableData = await apiCall(`/api/timetable?batch_id=${batchId}`);
        displayTimetable(timetableData, 'studentTimetable');
    } catch (error) {
        console.error('Error loading student timetable:', error);
    }
}

// Display Timetable
function displayTimetable(data, containerId) {
    const container = document.getElementById(containerId);
    
    if (data.length === 0) {
        container.innerHTML = '<div class="status-message">No timetable data available. Please generate a timetable first.</div>';
        return;
    }
    
    // Create timetable structure
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const timeSlots = [
        { id: 1, time: '10:45 - 11:45' },
        { id: 2, time: '11:45 - 12:45' },
        { id: 3, time: '12:45 - 13:45' },
        { id: 4, time: '14:15 - 15:15' },
        { id: 5, time: '15:15 - 16:15' },
        { id: 6, time: '16:15 - 17:30' }
    ];
    
    // Organize data by day and slot
    const schedule = {};
    data.forEach(item => {
        const day = item.day_of_week;
        const slot = item.slot_number;
        
        if (!schedule[day]) schedule[day] = {};
        if (!schedule[day][slot]) schedule[day][slot] = [];
        
        schedule[day][slot].push(item);
    });
    
    // Create table HTML
    let html = `
        <table class="timetable">
            <thead>
                <tr>
                    <th>Time</th>
                    ${days.map(day => `<th>${day}</th>`).join('')}
                </tr>
            </thead>
            <tbody>
    `;
    
    timeSlots.forEach(slot => {
        html += `<tr>`;
        html += `<td class="time-slot">${slot.time}</td>`;
        
        for (let day = 1; day <= 6; day++) {
            const classes = schedule[day] && schedule[day][slot.id] ? schedule[day][slot.id] : [];
            
            html += `<td>`;
            classes.forEach(cls => {
                const classType = cls.type === 'lab' ? 'lab' : 'theory';
                html += `
                    <div class="class-slot ${classType}">
                        <div class="subject">${cls.subject_name}</div>
                        <div class="faculty">${cls.faculty_name}</div>
                        <div class="room">${cls.classroom_name}</div>
                    </div>
                `;
            });
            html += `</td>`;
        }
        
        html += `</tr>`;
    });
    
    html += `
            </tbody>
        </table>
    `;
    
    container.innerHTML = html;
}

// Modal Functions
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'block';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Utility Functions
function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `status-message ${type}`;
    messageDiv.textContent = message;
    
    // Find a suitable container to show the message
    const container = document.querySelector('.tab-content.active') || document.querySelector('.panel.active');
    if (container) {
        container.insertBefore(messageDiv, container.firstChild);
        
        // Remove message after 5 seconds
        setTimeout(() => {
            if (messageDiv.parentNode) {
                messageDiv.parentNode.removeChild(messageDiv);
            }
        }, 5000);
    }
}

// Delete Functions (simplified for demo)
async function deleteFaculty(id) {
    if (confirm('Are you sure you want to delete this faculty member?')) {
        // Implementation would go here
        console.log('Delete faculty:', id);
        showMessage('Delete functionality not implemented in demo', 'error');
    }
}

async function deleteBatch(id) {
    if (confirm('Are you sure you want to delete this batch?')) {
        console.log('Delete batch:', id);
        showMessage('Delete functionality not implemented in demo', 'error');
    }
}

async function deleteSubject(id) {
    if (confirm('Are you sure you want to delete this subject?')) {
        console.log('Delete subject:', id);
        showMessage('Delete functionality not implemented in demo', 'error');
    }
}

async function deleteClassroom(id) {
    if (confirm('Are you sure you want to delete this classroom?')) {
        console.log('Delete classroom:', id);
        showMessage('Delete functionality not implemented in demo', 'error');
    }
}

async function deleteMapping(id) {
    if (confirm('Are you sure you want to delete this mapping?')) {
        console.log('Delete mapping:', id);
        showMessage('Delete functionality not implemented in demo', 'error');
    }
}