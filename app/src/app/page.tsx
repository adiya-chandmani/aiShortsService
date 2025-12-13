// #region agent log
// #endregion
import HomePage from '../components/home/HomePage';

// #region agent log
try {
  if (typeof window === 'undefined') {
    fetch('http://127.0.0.1:7242/ingest/3488d827-43aa-4265-9c85-a4d1c8210adf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:5',message:'Page.tsx module loading (server)',data:{},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'A'})}).catch(()=>{});
  }
} catch(e) {}
// #endregion

export default function Home() {
  // #region agent log
  try {
    if (typeof window === 'undefined') {
      fetch('http://127.0.0.1:7242/ingest/3488d827-43aa-4265-9c85-a4d1c8210adf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:14',message:'Home component rendering (server)',data:{hasHomePage:typeof HomePage !== 'undefined'},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'A'})}).catch(()=>{});
    }
  } catch(e) {
    fetch('http://127.0.0.1:7242/ingest/3488d827-43aa-4265-9c85-a4d1c8210adf',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({location:'page.tsx:14',message:'Home component error',data:{error:String(e)},timestamp:Date.now(),sessionId:'debug-session',runId:'run3',hypothesisId:'A'})}).catch(()=>{});
  }
  // #endregion
  return <HomePage />;
}
