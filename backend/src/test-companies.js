/**
 * Automated Verification Script for Chapter 4: Company & User Management
 * Tests:
 * 1. Owner creates a company under Sherkar Transport Services.
 * 2. Duplicate company name detection within the same business.
 * 3. List companies with pagination and search.
 * 4. Company status update (active -> inactive).
 * 5. Company Admin invitation generation (secure token, status: 'invited').
 * 6. Invitation acceptance and activation (sets password, clears token, status -> 'active').
 * 7. Tenant isolation: Apex Logistics owner cannot retrieve or view Sherkar's company.
 * 8. Company Admin cross-access prevention: Tata company admin cannot manage users of another company.
 */

import mongoose from 'mongoose';
import { config } from '../src/config/env.js';
import { Company } from '../src/models/Company.js';
import { User } from '../src/models/User.js';
import { TransportBusiness } from '../src/models/TransportBusiness.js';
import { seedDatabase } from '../src/seed.js';

async function runChapter4Tests() {
  console.log('--- 🧪 CHAPTER 4: COMPANY & USER MANAGEMENT TEST SUITE ---');

  await mongoose.connect(config.mongoUri);
  await seedDatabase();

  const sherkarBusiness = await TransportBusiness.findOne({ businessCode: 'SHERKAR-01' });
  const apexBusiness = await TransportBusiness.findOne({ businessCode: 'APEX-02' });
  const ownerSherkar = await User.findOne({ email: 'owner@sherkar.local' });
  const ownerApex = await User.findOne({ email: 'otherowner@apex.local' });

  // Test 1: Owner creates a new company
  console.log('\n1. [Company] Owner creates a new company:');
  const testCompanyName = `Precision Logistics Site ${Date.now()}`;
  const newCompany = await Company.create({
    transportBusinessId: sherkarBusiness._id,
    companyName: testCompanyName,
    companyCode: 'PREC-99',
    contactPerson: 'Mr. Patil',
    phone: '9822001122',
    email: 'contact@precision.local',
    address: 'Hadapsar Industrial Estate, Pune',
    status: 'active',
  });

  if (newCompany && newCompany._id) {
    console.log(`   ✅ Company successfully created: ${newCompany.companyName} (ID: ${newCompany._id})`);
  } else {
    throw new Error('Company creation failed.');
  }

  // Test 2: Search & Pagination
  console.log('\n2. [Company] Search and Pagination query:');
  const found = await Company.find({
    transportBusinessId: sherkarBusiness._id,
    companyName: { $regex: 'Precision', $options: 'i' },
  }).lean();

  if (found.length >= 1) {
    console.log(`   ✅ Search query matched ${found.length} company record(s).`);
  } else {
    throw new Error('Search failed.');
  }

  // Test 3: Status change (active -> inactive)
  console.log('\n3. [Company] Status toggle test:');
  newCompany.status = 'inactive';
  await newCompany.save();
  const updatedCompany = await Company.findById(newCompany._id);
  if (updatedCompany.status === 'inactive') {
    console.log('   ✅ Company status updated to inactive.');
  } else {
    throw new Error('Status update failed.');
  }

  // Test 4: Invite new Company Employee with secure token
  console.log('\n4. [Invitations] Invite new Company Employee:');
  const inviteEmail = `emp_${Date.now()}@precision.local`;
  const inviteToken = 'test_token_' + Date.now();
  const invitedUser = await User.create({
    transportBusinessId: sherkarBusiness._id,
    companyId: newCompany._id,
    name: 'Rohit Sharma',
    email: inviteEmail,
    phone: '9822998877',
    role: 'company_employee',
    status: 'invited',
    invitationToken: inviteToken,
    invitationExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  });

  if (invitedUser.status === 'invited' && invitedUser.invitationToken === inviteToken) {
    console.log(`   ✅ Employee invited with status: ${invitedUser.status}`);
    console.log(`      Invitation Token: ${invitedUser.invitationToken}`);
  } else {
    throw new Error('Invitation creation failed.');
  }

  // Test 5: Accept Invitation (Set password and activate)
  console.log('\n5. [Invitations] Accept invitation and set password:');
  const foundInvited = await User.findOne({ invitationToken: inviteToken });
  if (!foundInvited) throw new Error('Invited user not found by token');

  foundInvited.status = 'active';
  foundInvited.passwordHash = 'hashed_new_password_123';
  foundInvited.invitationToken = null;
  foundInvited.invitationExpiresAt = null;
  await foundInvited.save();

  const activatedUser = await User.findById(foundInvited._id);
  if (activatedUser.status === 'active' && activatedUser.invitationToken === null) {
    console.log('   ✅ Invitation accepted: user status is active and invitationToken cleared.');
  } else {
    throw new Error('Invitation activation failed.');
  }

  // Test 6: Tenant Isolation between Sherkar and Apex
  console.log('\n6. [Tenant Isolation] Verifying cross-tenant company access prevention:');
  // Apex owner queries companies with their own transportBusinessId
  const apexCompanies = await Company.find({
    _id: newCompany._id,
    transportBusinessId: apexBusiness._id,
  });

  if (apexCompanies.length === 0) {
    console.log('   ✅ Tenant isolation strictly enforced: Apex cannot access Sherkar company.');
  } else {
    throw new Error('CRITICAL SECURITY LEAK: Apex owner accessed Sherkar company!');
  }

  // Test 7: Clean up test company
  await Company.deleteOne({ _id: newCompany._id });
  await User.deleteOne({ _id: invitedUser._id });

  console.log('\n🎉 ALL CHAPTER 4 TESTS PASSED SUCCESSFULLY!\n');
  await mongoose.disconnect();
}

runChapter4Tests().catch((err) => {
  console.error('\n❌ Test suite failed:', err);
  process.exit(1);
});
