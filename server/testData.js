const axios = require('axios');

async function testData() {
  try {
    const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'fleet@transitops.com',
      password: 'Fleet@123'
    });
    
    const cookies = loginRes.headers['set-cookie'];
    if (!cookies) throw new Error('No cookies returned');
    const tokenCookie = cookies.find(c => c.startsWith('token='));
    const token = tokenCookie.split(';')[0];

    const kpiRes = await axios.get('http://localhost:5000/api/dashboard/kpis', {
      headers: { Cookie: token }
    });

    console.log('KPI Data:', JSON.stringify(kpiRes.data, null, 2));
  } catch (error) {
    if (error.response) {
      console.error('API Error:', JSON.stringify(error.response.data, null, 2));
    } else {
      console.error('Network Error:', error.message);
    }
  }
}

testData();
