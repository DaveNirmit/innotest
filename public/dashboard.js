// Global variables
let currentUser = null;
let facultyData = [];
let studentData = [];
let batchData = [];
let subjectData = [];
let classroomData = [];
let mappingData = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
    setupEventListeners();
});

function initializeApp() {
    // Check authentication
    const userSession = sessionStorage.getItem('currentUser');
    if (!userSession) {
        window.location.href = '/login.html';
        return;
    }
    
    currentUser = JSON.parse(userSession);
    
    // Update UI based on user role
    updateUserInterface();
    loadInitialData();
}

function updateUserInterface() {
    // Update user info
    document.getElementById('userInfo').textContent = `Welcome, ${currentUser.name} (${currentUser.role})`;
    
    // Show appropriate panel
    document.querySelectorAll('.panel').forEach(panel => {
        panel.style.display = 'none';
    });
    
    const panelId = currentUser.role + 'Panel';
    const panel = document.getElementById(panelId);
    if (panel) {
        panel.style.display = 'block';
    }
    
    // Load role-specific data
    if (currentUser.role === 'faculty') {
        loadFacultyTimetable(currentUser.id);
    } else if (currentUser.role === 'student') {
        loadStudentTimetable(currentUser.batch_id);
    }
}

function setupEventListeners() {
    // Logout button
    document.getElementById('logoutBtn').addEventListener('click', logout);
    
    // Tab navigation (admin only)
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', function() {
            const tabName = this.dataset.tab;
            switchTab(tabName);
        });
    });
    
    // Manual assignment form listeners
    document.getElementById('manualBatch')?.addEventListener('change', updateManualSubjects);
    document.getElementById('manualSubject')?.addEventListener('change', updateManualFaculty);
    
    // Close modals when clicking outside
    window.addEventListener('click', function(e) {
        if (e.target.classList.contains('modal')) {
            e.target.style.display = 'none';
        }
    });
}

function logout() {
    sessionStorage.removeItem('currentUser');
    window.location.href = '/login.html';
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
        case 'students':
            loadStudents();
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
        case 'manual':
            loadManualAssignmentData();
            loadManualTimetable();
            break;
    }
}

async function loadInitialData() {
    if (currentUser.role === 'admin') {
        await Promise.all([
            loadFaculty(),
            loadStudents(),
            loadBatches(),
            loadSubjects(),
            loadClassrooms(),
            loadMappings()
        ]);
    }
}

// API Functions
async function apiCall(endpoint, method = 'GET', data = null) {
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token || 'demo-token'}`
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
                <button class="btn btn-sm btn-secondary" onclick="editFaculty(${faculty.id})">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteFaculty(${faculty.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function editFaculty(id) {
    const faculty = facultyData.find(f => f.id === id);
    if (faculty) {
        document.getElementById('facultyId').value = faculty.id;
        document.getElementById('facultyName').value = faculty.name;
        document.getElementById('facultyEmail').value = faculty.email || '';
        document.getElementById('facultyPhone').value = faculty.phone || '';
        document.getElementById('facultyDepartment').value = faculty.department || '';
        document.getElementById('facultyModalTitle').textContent = 'Edit Faculty';
        openModal('facultyModal');
    }
}

async function saveFaculty(event) {
    event.preventDefault();
    
    const id = document.getElementById('facultyId').value;
    const formData = {
        name: document.getElementById('facultyName').value,
        email: document.getElementById('facultyEmail').value,
        phone: document.getElementById('facultyPhone').value,
        department: document.getElementById('facultyDepartment').value
    };
    
    try {
        if (id) {
            await apiCall(`/api/faculty/${id}`, 'PUT', formData);
            showMessage('Faculty updated successfully!', 'success');
        } else {
            await apiCall('/api/faculty', 'POST', formData);
            showMessage('Faculty added successfully!', 'success');
        }
        
        closeModal('facultyModal');
        document.getElementById('facultyForm').reset();
        await loadFaculty();
    } catch (error) {
        console.error('Error saving faculty:', error);
    }
}

// Student Management
async function loadStudents() {
    try {
        studentData = await apiCall('/api/students');
        updateStudentTable();
        updateStudentBatchSelector();
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

function updateStudentTable() {
    const tbody = document.querySelector('#studentTable tbody');
    tbody.innerHTML = '';
    
    studentData.forEach(student => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${student.name}</td>
            <td>${student.roll_number}</td>
            <td>${student.email}</td>
            <td>${student.batch_name || 'N/A'}</td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="editStudent(${student.id})">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteStudent(${student.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function updateStudentBatchSelector() {
    const batchSelect = document.getElementById('studentBatch');
    batchSelect.innerHTML = '<option value="">Select Batch</option>';
    
    batchData.forEach(batch => {
        const option = document.createElement('option');
        option.value = batch.id;
        option.textContent = batch.name;
        batchSelect.appendChild(option);
    });
}

function editStudent(id) {
    const student = studentData.find(s => s.id === id);
    if (student) {
        document.getElementById('studentId').value = student.id;
        document.getElementById('studentName').value = student.name;
        document.getElementById('studentRoll').value = student.roll_number;
        document.getElementById('studentEmail').value = student.email;
        document.getElementById('studentBatch').value = student.batch_id || '';
        document.getElementById('studentModalTitle').textContent = 'Edit Student';
        openModal('studentModal');
    }
}

async function saveStudent(event) {
    event.preventDefault();
    
    const id = document.getElementById('studentId').value;
    const formData = {
        name: document.getElementById('studentName').value,
        roll_number: document.getElementById('studentRoll').value,
        email: document.getElementById('studentEmail').value,
        batch_id: parseInt(document.getElementById('studentBatch').value)
    };
    
    try {
        if (id) {
            await apiCall(`/api/students/${id}`, 'PUT', formData);
            showMessage('Student updated successfully!', 'success');
        } else {
            await apiCall('/api/students', 'POST', formData);
            showMessage('Student added successfully!', 'success');
        }
        
        closeModal('studentModal');
        document.getElementById('studentForm').reset();
        await loadStudents();
    } catch (error) {
        console.error('Error saving student:', error);
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
                <button class="btn btn-sm btn-secondary" onclick="editBatch(${batch.id})">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteBatch(${batch.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function editBatch(id) {
    const batch = batchData.find(b => b.id === id);
    if (batch) {
        document.getElementById('batchId').value = batch.id;
        document.getElementById('batchName').value = batch.name;
        document.getElementById('batchYear').value = batch.year;
        document.getElementById('batchSemester').value = batch.semester;
        document.getElementById('batchStudents').value = batch.student_count;
        document.getElementById('batchModalTitle').textContent = 'Edit Batch';
        openModal('batchModal');
    }
}

async function saveBatch(event) {
    event.preventDefault();
    
    const id = document.getElementById('batchId').value;
    const formData = {
        name: document.getElementById('batchName').value,
        year: parseInt(document.getElementById('batchYear').value),
        semester: parseInt(document.getElementById('batchSemester').value),
        student_count: parseInt(document.getElementById('batchStudents').value)
    };
    
    try {
        if (id) {
            await apiCall(`/api/batches/${id}`, 'PUT', formData);
            showMessage('Batch updated successfully!', 'success');
        } else {
            await apiCall('/api/batches', 'POST', formData);
            showMessage('Batch added successfully!', 'success');
        }
        
        closeModal('batchModal');
        document.getElementById('batchForm').reset();
        await loadBatches();
    } catch (error) {
        console.error('Error saving batch:', error);
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
                <button class="btn btn-sm btn-secondary" onclick="editSubject(${subject.id})">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteSubject(${subject.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function editSubject(id) {
    const subject = subjectData.find(s => s.id === id);
    if (subject) {
        document.getElementById('subjectId').value = subject.id;
        document.getElementById('subjectName').value = subject.name;
        document.getElementById('subjectCode').value = subject.code;
        document.getElementById('subjectType').value = subject.type;
        document.getElementById('subjectCredits').value = subject.credits;
        document.getElementById('subjectModalTitle').textContent = 'Edit Subject';
        openModal('subjectModal');
    }
}

async function saveSubject(event) {
    event.preventDefault();
    
    const id = document.getElementById('subjectId').value;
    const formData = {
        name: document.getElementById('subjectName').value,
        code: document.getElementById('subjectCode').value,
        type: document.getElementById('subjectType').value,
        credits: parseInt(document.getElementById('subjectCredits').value)
    };
    
    try {
        if (id) {
            await apiCall(`/api/subjects/${id}`, 'PUT', formData);
            showMessage('Subject updated successfully!', 'success');
        } else {
            await apiCall('/api/subjects', 'POST', formData);
            showMessage('Subject added successfully!', 'success');
        }
        
        closeModal('subjectModal');
        document.getElementById('subjectForm').reset();
        await loadSubjects();
    } catch (error) {
        console.error('Error saving subject:', error);
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
                <button class="btn btn-sm btn-secondary" onclick="editClassroom(${classroom.id})">Edit</button>
                <button class="btn btn-sm btn-danger" onclick="deleteClassroom(${classroom.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(row);
    });
}

function editClassroom(id) {
    const classroom = classroomData.find(c => c.id === id);
    if (classroom) {
        document.getElementById('classroomId').value = classroom.id;
        document.getElementById('classroomName').value = classroom.name;
        document.getElementById('classroomCapacity').value = classroom.capacity;
        document.getElementById('classroomType').value = classroom.type;
        document.getElementById('classroomBuilding').value = classroom.building || '';
        document.getElementById('classroomModalTitle').textContent = 'Edit Classroom';
        openModal('classroomModal');
    }
}

async function saveClassroom(event) {
    event.preventDefault();
    
    const id = document.getElementById('classroomId').value;
    const formData = {
        name: document.getElementById('classroomName').value,
        capacity: parseInt(document.getElementById('classroomCapacity').value),
        type: document.getElementById('classroomType').value,
        building: document.getElementById('classroomBuilding').value
    };
    
    try {
        if (id) {
            await apiCall(`/api/classrooms/${id}`, 'PUT', formData);
            showMessage('Classroom updated successfully!', 'success');
        } else {
            await apiCall('/api/classrooms', 'POST', formData);
            showMessage('Classroom added successfully!', 'success');
        }
        
        closeModal('classroomModal');
        document.getElementById('classroomForm').reset();
        await loadClassrooms();
    } catch (error) {
        console.error('Error saving classroom:', error);
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
                <button class="btn btn-sm btn-danger" onclick="deleteMapping(${mapping.id})">Delete</button>
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

// Manual Assignment Functions
function loadManualAssignmentData() {
    // Load batches
    const batchSelect = document.getElementById('manualBatch');
    batchSelect.innerHTML = '<option value="">Select Batch</option>';
    batchData.forEach(batch => {
        const option = document.createElement('option');
        option.value = batch.id;
        option.textContent = batch.name;
        batchSelect.appendChild(option);
    });
    
    // Load batch filter
    const batchFilter = document.getElementById('manualBatchFilter');
    batchFilter.innerHTML = '<option value="">All Batches</option>';
    batchData.forEach(batch => {
        const option = document.createElement('option');
        option.value = batch.id;
        option.textContent = batch.name;
        batchFilter.appendChild(option);
    });
    
    // Load classrooms
    const classroomSelect = document.getElementById('manualClassroom');
    classroomSelect.innerHTML = '<option value="">Select Classroom</option>';
    classroomData.forEach(classroom => {
        const option = document.createElement('option');
        option.value = classroom.id;
        option.textContent = `${classroom.name} (${classroom.type})`;
        classroomSelect.appendChild(option);
    });
}

function updateManualSubjects() {
    const batchId = document.getElementById('manualBatch').value;
    const subjectSelect = document.getElementById('manualSubject');
    
    subjectSelect.innerHTML = '<option value="">Select Subject</option>';
    
    if (batchId) {
        // Filter subjects based on batch mappings
        const batchMappings = mappingData.filter(m => m.batch_id == batchId);
        batchMappings.forEach(mapping => {
            const option = document.createElement('option');
            option.value = mapping.subject_id;
            option.textContent = `${mapping.subject_name} (${mapping.code})`;
            subjectSelect.appendChild(option);
        });
    }
}

function updateManualFaculty() {
    const batchId = document.getElementById('manualBatch').value;
    const subjectId = document.getElementById('manualSubject').value;
    const facultySelect = document.getElementById('manualFaculty');
    
    facultySelect.innerHTML = '<option value="">Select Faculty</option>';
    
    if (batchId && subjectId) {
        // Find the mapping for this batch-subject combination
        const mapping = mappingData.find(m => m.batch_id == batchId && m.subject_id == subjectId);
        if (mapping) {
            const option = document.createElement('option');
            option.value = mapping.faculty_id;
            option.textContent = mapping.faculty_name;
            facultySelect.appendChild(option);
        }
    }
}

async function assignManualSlot(event) {
    event.preventDefault();
    
    const formData = {
        batch_id: parseInt(document.getElementById('manualBatch').value),
        subject_id: parseInt(document.getElementById('manualSubject').value),
        faculty_id: parseInt(document.getElementById('manualFaculty').value),
        classroom_id: parseInt(document.getElementById('manualClassroom').value),
        day_of_week: parseInt(document.getElementById('manualDay').value),
        time_slot_id: parseInt(document.getElementById('manualTimeSlot').value)
    };
    
    try {
        await apiCall('/api/manual-assign', 'POST', formData);
        closeModal('manualAssignModal');
        document.getElementById('manualAssignForm').reset();
        await loadManualTimetable();
        showMessage('Slot assigned successfully!', 'success');
    } catch (error) {
        console.error('Error assigning slot:', error);
    }
}

async function loadManualTimetable() {
    try {
        const batchFilter = document.getElementById('manualBatchFilter')?.value;
        let url = '/api/timetable';
        if (batchFilter) {
            url += `?batch_id=${batchFilter}`;
        }
        
        const timetableData = await apiCall(url);
        displayManualTimetable(timetableData);
    } catch (error) {
        console.error('Error loading manual timetable:', error);
    }
}

function displayManualTimetable(data) {
    const container = document.getElementById('manualTimetable');
    
    if (data.length === 0) {
        container.innerHTML = '<div class="status-message">No timetable data available.</div>';
        return;
    }
    
    // Create enhanced timetable with edit capabilities
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
        <table class="timetable manual-timetable">
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
            
            html += `<td class="manual-slot" data-day="${day}" data-slot="${slot.id}">`;
            classes.forEach(cls => {
                const classType = cls.type === 'lab' ? 'lab' : 'theory';
                html += `
                    <div class="class-slot ${classType}" data-id="${cls.id}">
                        <div class="subject">${cls.subject_name}</div>
                        <div class="batch">${cls.batch_name}</div>
                        <div class="faculty">${cls.faculty_name}</div>
                        <div class="room">${cls.classroom_name}</div>
                        <button class="remove-slot" onclick="removeManualSlot(${cls.id})">&times;</button>
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

async function removeManualSlot(id) {
    if (confirm('Are you sure you want to remove this slot?')) {
        try {
            await apiCall(`/api/timetable/${id}`, 'DELETE');
            await loadManualTimetable();
            showMessage('Slot removed successfully!', 'success');
        } catch (error) {
            console.error('Error removing slot:', error);
        }
    }
}

// Timetable Generation
async function generateTimetable() {
    const statusDiv = document.getElementById('generateStatus');
    statusDiv.innerHTML = '<div class="status-message loading">🔄 Generating timetable... This may take a few moments.</div>';
    
    try {
        await apiCall('/api/generate-timetable', 'POST');
        statusDiv.innerHTML = '<div class="status-message success">✅ Timetable generated successfully! Switch to Manual Assignment tab to view and edit the results.</div>';
    } catch (error) {
        statusDiv.innerHTML = '<div class="status-message error">❌ Error generating timetable. Please try again.</div>';
        console.error('Error generating timetable:', error);
    }
}

// Faculty and Student Timetable Views
async function loadFacultyTimetable(facultyId) {
    try {
        const timetableData = await apiCall(`/api/timetable?faculty_id=${facultyId}`);
        displayTimetable(timetableData, 'facultyTimetable');
    } catch (error) {
        console.error('Error loading faculty timetable:', error);
    }
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
    
    // Reset form if it exists
    const form = document.querySelector(`#${modalId} form`);
    if (form) {
        form.reset();
        // Clear hidden ID fields
        const idField = form.querySelector('input[type="hidden"]');
        if (idField) {
            idField.value = '';
        }
        // Reset modal titles
        const title = form.querySelector('h3');
        if (title && title.id.includes('Modal')) {
            title.textContent = title.textContent.replace('Edit', 'Add');
        }
    }
}

// Utility Functions
function showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `status-message ${type}`;
    messageDiv.textContent = message;
    
    // Find a suitable container to show the message
    const container = document.querySelector('.tab-content.active') || document.querySelector('.panel[style*="block"]');
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

// Delete Functions
async function deleteFaculty(id) {
    if (confirm('Are you sure you want to delete this faculty member?')) {
        try {
            await apiCall(`/api/faculty/${id}`, 'DELETE');
            await loadFaculty();
            showMessage('Faculty deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting faculty:', error);
        }
    }
}

async function deleteStudent(id) {
    if (confirm('Are you sure you want to delete this student?')) {
        try {
            await apiCall(`/api/students/${id}`, 'DELETE');
            await loadStudents();
            showMessage('Student deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting student:', error);
        }
    }
}

async function deleteBatch(id) {
    if (confirm('Are you sure you want to delete this batch?')) {
        try {
            await apiCall(`/api/batches/${id}`, 'DELETE');
            await loadBatches();
            showMessage('Batch deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting batch:', error);
        }
    }
}

async function deleteSubject(id) {
    if (confirm('Are you sure you want to delete this subject?')) {
        try {
            await apiCall(`/api/subjects/${id}`, 'DELETE');
            await loadSubjects();
            showMessage('Subject deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting subject:', error);
        }
    }
}

async function deleteClassroom(id) {
    if (confirm('Are you sure you want to delete this classroom?')) {
        try {
            await apiCall(`/api/classrooms/${id}`, 'DELETE');
            await loadClassrooms();
            showMessage('Classroom deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting classroom:', error);
        }
    }
}

async function deleteMapping(id) {
    if (confirm('Are you sure you want to delete this mapping?')) {
        try {
            await apiCall(`/api/subject-batch/${id}`, 'DELETE');
            await loadMappings();
            showMessage('Mapping deleted successfully!', 'success');
        } catch (error) {
            console.error('Error deleting mapping:', error);
        }
    }
}