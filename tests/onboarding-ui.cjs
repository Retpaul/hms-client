const {chromium}=require('C:/Users/DLL/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const base=process.env.HMS_PREVIEW_URL||'http://localhost:3100';
async function verify(){
  const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1050}}),errors=[];
  const output=path.resolve(__dirname,'../artifacts/onboarding');fs.mkdirSync(output,{recursive:true});
  page.on('pageerror',e=>errors.push(e.message));page.on('dialog',d=>d.accept());
  const goto=async p=>{await page.goto(`${base}${p}`,{waitUntil:'networkidle'});};
  const snapshot=()=>page.evaluate(()=>JSON.parse(sessionStorage.getItem('hms-demo-v1')));
  try{
    await goto('/auth/organisation');await page.getByRole('link',{name:'Start with your work email'}).waitFor();
    await goto('/auth/sign-in');await page.getByLabel('Official work email').fill('owner@gmail.com');await page.getByRole('button',{name:'Continue with work email'}).click();await page.locator('p.error-message[role=alert]').waitFor();assert.match(await page.locator('p.error-message[role=alert]').innerText(),/official work email/);
    await page.getByLabel('Official work email').fill('owner@greenfield.example');await page.getByRole('button',{name:'Continue with work email'}).click();await page.waitForURL('**/auth/check-email');await page.getByRole('link',{name:'Verify work email & continue'}).click();await page.getByRole('button',{name:'Confirm email & continue'}).click();await page.waitForURL('**/auth/organisation');
    console.log('Verified work-email onboarding');
    const values={'Your full name':'Ada Green','Organisation name':'Greenfield Hospital','Organisation phone':'+2348012345678','Street address':'1 Demo Road','City':'Lagos','State / region':'Lagos','Country':'Nigeria'};
    for(const [label,value] of Object.entries(values))await page.getByLabel(label,{exact:true}).fill(value);
    await page.getByLabel('Organisation type').selectOption('Hospital');await page.getByRole('button',{name:'Create organisation & continue'}).click();await page.waitForURL('**/dashboard/admin/people');await page.getByRole('heading',{name:'People',exact:true}).waitFor();
    let s=await snapshot(),orgId=s.organisationId;assert.equal(s.session.role,'admin');assert.equal(s.demo.datasets[orgId].staff[0].email,'owner@greenfield.example');assert.equal(s.demo.datasets[orgId].patients.length,0);
    await page.screenshot({path:path.join(output,'people.png'),fullPage:true});
    await page.getByRole('button',{name:'Add department',exact:true}).first().click();let dialog=page.getByRole('dialog');await dialog.getByLabel('Department name').fill('Cardiology');await dialog.getByLabel('Description').fill('Our heart care team');await dialog.getByRole('button',{name:'Create department'}).click();await page.getByRole('link',{name:'Open Cardiology department'}).waitFor();
    await page.getByRole('link',{name:'Open Cardiology department'}).click();await page.getByRole('heading',{name:'Cardiology team',exact:true}).waitFor();await page.getByRole('button',{name:'Add user',exact:true}).click();dialog=page.getByRole('dialog');await dialog.getByLabel('Full name').fill('Dr. Zainab Demo');await dialog.getByLabel('Official work email').fill('zainab@greenfield.example');
    await dialog.getByRole('button',{name:'Prepare invitation'}).click();assert.equal((await snapshot()).demo.datasets[orgId].staff.length,1); // Required role prevents submission.
    await dialog.getByLabel('User role').selectOption('doctor');await page.screenshot({path:path.join(output,'add-user.png'),fullPage:true});await dialog.getByRole('button',{name:'Prepare invitation'}).click();await page.getByText('Dr. Zainab Demo',{exact:true}).waitFor();
    s=await snapshot();assert.equal(s.demo.datasets[orgId].staff[1].role,'doctor');assert.equal(s.demo.datasets[orgId].staff[1].department,'Cardiology');assert.equal(s.demo.datasets[orgId].staff[1].enabled,false);
    await page.reload({waitUntil:'networkidle'});await page.getByText('Dr. Zainab Demo',{exact:true}).waitFor();await page.screenshot({path:path.join(output,'department.png'),fullPage:true});await page.getByRole('button',{name:'Preview invitation',exact:true}).click();await page.getByRole('link',{name:'Open invitation & join team'}).click();await page.getByRole('button',{name:'Accept invitation & open workspace'}).click();await page.waitForURL('**/dashboard/doctor');
    s=await snapshot();assert.equal(s.session.role,'doctor');assert.equal(s.demo.datasets[orgId].staff[1].status,'active');assert.equal(s.demo.datasets[orgId].staff.filter(p=>p.owner).length,1);
    console.log('Verified departments and assigned-role invitation acceptance');
    await goto('/auth/sign-in');await page.getByLabel('Official work email').fill('owner@greenfield.example');await page.getByRole('button',{name:'Continue with work email'}).click();await page.getByRole('link',{name:'Verify work email & continue'}).click();await page.getByRole('button',{name:'Confirm email & continue'}).click();await page.waitForURL('**/dashboard/admin/people');assert.equal((await snapshot()).demo.hospitals.length,3);
    await page.getByRole('link',{name:'Open Pharmacy department'}).click();await page.getByRole('button',{name:'Add user',exact:true}).click();dialog=page.getByRole('dialog');await dialog.getByLabel('Full name').fill('Pharmacist Demo');await dialog.getByLabel('Official work email').fill('pharmacy@greenfield.example');await dialog.getByLabel('User role').selectOption('pharmacy');await dialog.getByRole('button',{name:'Prepare invitation'}).click();
    s=await snapshot();const oldToken=s.demo.datasets[orgId].invitations.find(i=>i.email==='pharmacy@greenfield.example').token;await page.getByRole('button',{name:'Resend',exact:true}).click();assert.notEqual((await snapshot()).demo.datasets[orgId].invitations.find(i=>i.email==='pharmacy@greenfield.example').token,oldToken);await page.getByRole('button',{name:'Revoke',exact:true}).click();s=await snapshot();const revoked=s.demo.datasets[orgId].invitations.find(i=>i.email==='pharmacy@greenfield.example');await goto(`/auth/invitation?token=${revoked.token}`);assert.equal(await page.getByRole('button',{name:'Accept invitation & open workspace'}).count(),0);
    await goto('/dashboard/admin/people');await page.setViewportSize({width:390,height:844});await page.screenshot({path:path.join(output,'people-mobile.png'),fullPage:true});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.getByRole('button',{name:'Add department',exact:true}).first().click();dialog=page.getByRole('dialog');await dialog.getByLabel('Department name').waitFor();await page.keyboard.press('Escape');assert.equal(await dialog.isVisible(),false);
    for(const route of ['overview','patients','inventory','billing','claims','administration']){await goto(`/dashboard/admin/${route}`);await page.locator('.demo-page-heading').waitFor();}
    assert.deepEqual(errors,[]);console.log(`PASS: full onboarding, first admin, department modal, required user role, invitation acceptance/replay, returning sign-in, persistence, mobile and empty-organisation screens. Screenshots: ${output}`);
  }finally{await browser.close();}
}
verify().catch(e=>{console.error(e);process.exitCode=1;});
