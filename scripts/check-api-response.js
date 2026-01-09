
const http = require('http');

const patientId = '1bbd288f-58f7-4847-8761-f57b506143b4';
const url = `http://localhost:3000/api/medical-records?patient_id=${patientId}`;

console.log(`📡 Testing API: ${url}`);

http.get(url, (res) => {
    console.log(`Status: ${res.statusCode}`);
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        console.log('Body:', data.substring(0, 500));
        try {
            const json = JSON.parse(data);
            console.log('JSON Length:', Array.isArray(json) ? json.length : 'Not Array');
        } catch (e) {
            console.log('Not JSON');
        }
    });
}).on('error', (err) => {
    console.error('❌ Error:', err.message);
});
