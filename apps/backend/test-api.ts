async function runTests() {
  const baseURL = 'http://localhost:5000/api';
  try {
    console.log('--- Testing Registration ---');
    const registerRes = await fetch(`${baseURL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Test Student',
        email: `test_${Date.now()}@example.com`,
        password: 'password123',
        role: 'STUDENT',
      }),
    });
    
    const registerData: any = await registerRes.json();
    if (!registerRes.ok) throw new Error(JSON.stringify(registerData));
    
    console.log('Registration Success:', registerData.message);
    const token = registerData.token;
    const email = registerData.user.email;

    console.log('\n--- Testing Login ---');
    const loginRes = await fetch(`${baseURL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        password: 'password123',
      }),
    });
    
    const loginData: any = await loginRes.json();
    if (!loginRes.ok) throw new Error(JSON.stringify(loginData));
    
    console.log('Login Success:', loginData.message);

    console.log('\n--- Testing Get Me ---');
    const meRes = await fetch(`${baseURL}/auth/me`, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}` 
      },
    });
    
    const meData: any = await meRes.json();
    if (!meRes.ok) throw new Error(JSON.stringify(meData));
    
    console.log('Get Me Success:', meData.user.name);

    console.log('\n--- All Core Auth Tests Passed ---');
  } catch (error: any) {
    console.error('Test Failed:', error.message);
    process.exit(1);
  }
}

runTests();
