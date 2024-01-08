document.getElementById('image-input').addEventListener('change', handleFileSelect, false);
document.getElementById('convert-button').addEventListener('click', uploadAndConvertImages, false);
document.getElementById('global-extension-select').addEventListener('change', applyGlobalExtension, false);
document.getElementById('download-button').addEventListener('click', function() {
    window.location.href = '/downloads';
});


const downloadButton = document.getElementById('download-button'); // 수정된 부분

function handleFileSelect(event) {
    const files = event.target.files;
    const tbody = document.getElementById('image-table').querySelector('tbody');
    tbody.innerHTML = '';

    for (const file of files) {
        const row = tbody.insertRow();
        const nameCell = row.insertCell();
        nameCell.textContent = file.name;

        const selectCell = row.insertCell();
        const select = document.createElement('select');
        select.classList.add('extension-select');
        ['jpeg', 'png', 'webp', 'gif'].forEach(ext => {
            const option = document.createElement('option');
            option.value = ext;
            option.textContent = ext.toUpperCase();
            select.appendChild(option);
        });
        selectCell.appendChild(select);

        const statusCell = row.insertCell();
        statusCell.textContent = '작업 대기';
    }
}

function applyGlobalExtension() {
    const selectedExtension = document.getElementById('global-extension-select').value;
    setGlobalExtension(selectedExtension);
}

function setGlobalExtension(extension) {
    const formatDropdowns = document.querySelectorAll('.extension-select');
    formatDropdowns.forEach(dropdown => dropdown.value = extension);
}

async function uploadAndConvertImages() {
    const inputElement = document.getElementById('image-input');
    const files = inputElement.files;
    const formatData = Array.from(document.querySelectorAll('.extension-select')).map(select => select.value);

    for (let i = 0; i < files.length; i++) {
        updateConversionStatus(i, '변환 중');
        const file = files[i];
        const formData = new FormData();
        formData.append('images', file, file.name);
        formData.append('formats', JSON.stringify([formatData[i]]));

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData,
            });

            if (!response.ok) {
                console.error('서버에서 오류가 발생했습니다.');
                updateConversionStatus(i, '변환 실패');
                continue; // 수정된 부분: 실패한 파일에 대해 처리를 계속 진행합니다.
            }
            updateConversionStatus(i, '변환 완료');
        } catch (error) {
            console.error('요청을 보내는 중 오류가 발생했습니다: ', error);
            updateConversionStatus(i, '변환 실패');
            continue; // 수정된 부분: 오류 발생 시 다음 파일 처리를 계속합니다.
        }
    }

    downloadButton.style.display = 'inline'; // 수정된 부분: 변환 완료 후 다운로드 버튼 표시
}

function updateConversionStatus(fileIndex, status) {
    const tableRow = document.querySelector(`#image-table tbody tr:nth-child(${fileIndex + 1})`);
    if (tableRow && tableRow.cells[2]) {
        tableRow.cells[2].textContent = status;
        styleStatusCell(tableRow.cells[2], status);
    }
}

function styleStatusCell(cell, status) {
    if (status === '변환 완료') {
        cell.style.fontWeight = 'bold';
        cell.style.color = 'green';
    } else if (status === '변환 실패') {
        cell.style.fontWeight = 'bold';
        cell.style.color = 'red';
    }
}

function downloadConvertedImages() {
    window.location.href = '/downloads';
}
