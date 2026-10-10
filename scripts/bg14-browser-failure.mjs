/* global process */
import {mkdir,writeFile} from 'node:fs/promises';
import {join} from 'node:path';

/**
 * Only capture the isolated synthetic run, and only on failure.
 * Never write cookies, Authorization headers, request/response bodies or tokens.
 */
export async function recordBrowserFailure(browser, reason, stage='workflow') {
  const directory=join(process.cwd(),'artifacts','bg14');
  await mkdir(directory,{recursive:true});
  const diagnosis={
    stage,
    error:reason,
    responses:(browser?.responses ?? []).slice(-18).map(({method,path,status})=>({method,path,status})),
  };
  await writeFile(join(directory,'failure.json'),JSON.stringify(diagnosis,null,2)+'\n');
  if(browser) {
    const screenshot=await browser.client.send('Page.captureScreenshot',{format:'png'},browser.sessionId);
    if(screenshot?.data) {
      await writeFile(join(directory,'failure.png'),Buffer.from(screenshot.data,'base64'));
    }
  }
  return diagnosis;
}
