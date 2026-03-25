import test from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import { app } from '../index';

const buildEmail = () => `test_${Date.now()}_${Math.floor(Math.random() * 100000)}@example.com`;

test('register, login, me, logout, forgot-password, reset-password and session persistence', async () => {
  const email = buildEmail();
  const password = 'StrongPass123';
  const newPassword = 'NewStrongPass123';
  const agent = request.agent(app);

  const registerResponse = await agent.post('/api/auth/register').send({
    name: 'Integration User',
    email,
    password,
    role: 'STUDENT',
  });
  assert.equal(registerResponse.status, 201);
  assert.equal(registerResponse.body.user.email, email);

  const meAfterRegister = await agent.get('/api/auth/me');
  assert.equal(meAfterRegister.status, 200);
  assert.equal(meAfterRegister.body.user.email, email);

  const logoutResponse = await agent.post('/api/auth/logout');
  assert.equal(logoutResponse.status, 200);

  const meAfterLogout = await agent.get('/api/auth/me');
  assert.equal(meAfterLogout.status, 401);

  const loginResponse = await agent.post('/api/auth/login').send({
    email,
    password,
  });
  assert.equal(loginResponse.status, 200);
  assert.equal(loginResponse.body.user.email, email);

  const meAfterLogin = await agent.get('/api/auth/me');
  assert.equal(meAfterLogin.status, 200);
  assert.equal(meAfterLogin.body.user.email, email);

  const forgotPasswordResponse = await agent.post('/api/auth/forgot-password').send({ email });
  assert.equal(forgotPasswordResponse.status, 200);
  assert.ok(forgotPasswordResponse.body.resetToken);

  const resetPasswordResponse = await agent.post('/api/auth/reset-password').send({
    token: forgotPasswordResponse.body.resetToken,
    password: newPassword,
  });
  assert.equal(resetPasswordResponse.status, 200);

  await agent.post('/api/auth/logout');
  const loginWithOldPassword = await agent.post('/api/auth/login').send({
    email,
    password,
  });
  assert.equal(loginWithOldPassword.status, 401);

  const loginWithNewPassword = await agent.post('/api/auth/login').send({
    email,
    password: newPassword,
  });
  assert.equal(loginWithNewPassword.status, 200);
});
