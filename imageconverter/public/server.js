const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
app.use(cors());

// output 및 uploads 디렉토리 삭제 함수
function deleteDirectories() {
    const outputDir = path.join(__dirname, 'output');
    const uploadsDir = path.join(__dirname, 'uploads');
    [outputDir, uploadsDir].forEach(dir => {
        if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    });
}

// 서버 시작 시 output 및 uploads 디렉토리 삭제
deleteDirectories();

function deleteDownloadsDir() {
    const downloadsDir = path.join(__dirname, 'downloads');
    if (fs.existsSync(downloadsDir)) {
        fs.readdirSync(downloadsDir).forEach(file => {
            const filePath = path.join(downloadsDir, file);
            fs.unlinkSync(filePath);
        });
    }
}

// 서버 시작 시 downloads 디렉토리 내 파일 삭제
deleteDownloadsDir();

// 파일 업로드 및 다운로드 디렉토리 설정
const directories = ['uploads', 'downloads', 'output'];
directories.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
    }
});

// multer 설정
const upload = multer({ 
    dest: path.join(__dirname, 'uploads'),
    limits: { fileSize: 1024 * 1024 * 5 } // 5MB 제한
});
app.use(express.static(path.join(__dirname, 'main')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'main', 'index.html'));
});

app.post('/upload', upload.array('images'), async (req, res) => {
    try {
        const zipFilePath = path.join(__dirname, 'downloads', 'converted_images.zip');
        const zipOutput = fs.createWriteStream(zipFilePath);
        const archive = archiver('zip', { zlib: { level: 9 } });
        archive.pipe(zipOutput);

        const formats = JSON.parse(req.body.formats);
        let filePromises = [];

        for (const file of req.files) {
            const format = formats[req.files.indexOf(file)];
            let safeFilename = file.originalname.replace(/[^a-zA-Z0-9가-힣.]/g, '_');
            if (safeFilename.length > 100) safeFilename = safeFilename.substring(0, 100);

            const newFilename = `${safeFilename}.${format}`;
            const outputPath = path.join(__dirname, 'output', newFilename);

            let filePromise = sharp(file.path)
                .toFormat(format)
                .toFile(outputPath)
                .catch(error => {
                    console.error(`Error processing file ${file.originalname}: ${error}`);
                    throw error;
                });
            
            filePromises.push(filePromise);
        }

        // 모든 이미지 변환 완료 후
        await Promise.all(filePromises);

        // 변환된 파일들을 ZIP 파일에 추가
        const outputFiles = fs.readdirSync(path.join(__dirname, 'output'));
        outputFiles.forEach(file => {
            const filePath = path.join(__dirname, 'output', file);
            if (fs.existsSync(filePath)) {
                archive.file(filePath, { name: file });
            } else {
                console.error(`File does not exist: ${filePath}`);
            }
        });

        archive.on('error', (err) => {
            throw err;
        });

        archive.finalize();

        zipOutput.on('close', () => {
            // 클라이언트에게 ZIP 파일 제공
            res.download(zipFilePath, (err) => {
                if (err) {
                    console.error('Error sending file:', err);
                } else {
                    console.log('File sent successfully');
                }
    
                // 업로드된 원본 이미지 파일 삭제
                req.files.forEach(file => {
                    fs.unlink(file.path, (err) => {
                        if (err) {
                            console.error(`Error deleting file ${file.path}:`, err);
                            // 오류 처리
                        } else {
                            console.log(`File ${file.path} deleted successfully`);
                        }
                    });
                });
            });
        });

        zipOutput.on('error', (err) => {
            console.error('Zip file creation error:', err);
            res.status(500).send('Internal Server Error');
        });
    } catch (error) {
        console.error('Global error:', error);
        res.status(500).send('Internal Server Error');
    }
});

app.get('/downloads', (req, res) => {
    const zipFilePath = path.join(__dirname, 'downloads', 'converted_images.zip');
    if (fs.existsSync(zipFilePath)) {
        res.download(zipFilePath, (err) => {
            if (err) console.error(err);
            else fs.unlinkSync(zipFilePath);
        });
    } else {
        res.status(404).send('File not found');
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
