import { Router, type Request, type Response } from 'express';
import { rateLimit } from 'express-rate-limit';
import { AccountStore, AccountError } from './accounts';

const COOKIE='wg_study_session';
const token=(req:Request)=>req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
export function accountRoutes(store:AccountStore) {
  const router=Router();
  router.use((req,res,next)=>{
    res.set('Cache-Control','private, no-store');
    // SameSite cookies + JSON/custom-header requirement prevent cross-site form writes.
    if(!['GET','HEAD'].includes(req.method) && (!req.is('application/json') || req.get('X-Study-Request')!=='1' || req.get('Sec-Fetch-Site')==='cross-site')) {
      return res.status(403).json({message:'Open the study app to make this request.'});
    }
    next();
  });
  const authLimit=rateLimit({windowMs:15*60_000,limit:20,standardHeaders:true,legacyHeaders:false,message:{message:'Too many sign-in attempts. Try again in 15 minutes.'}});
  function fail(res:Response,err:unknown) {
    const known=err instanceof AccountError;
    res.status(known?err.status:500).json({message:known?err.message:'Your account could not be saved. Please try again.'});
  }
  for(const action of ['register','login','recover'] as const) router.post('/'+action,authLimit,async(req,res)=>{
    try {
      const result=action==='register'?await store.register(req.body.username,req.body.pin):action==='recover'?await store.recover(req.body.username,req.body.recoveryCode,req.body.pin):await store.login(req.body.username,req.body.pin);
      res.cookie(COOKIE,result.token,{httpOnly:true,sameSite:'strict',secure:req.secure,maxAge:30*24*60*60_000,path:'/'});
      const {token:secret,accountId,...safe}=result;
      res.json(safe);
    }catch(err){fail(res,err);}
  });
  router.get('/me',(req,res)=>{
    const user=store.identify(token(req));
    res.json(user?{username:user.username,...store.progress(user.id)}:{username:null});
  });
  router.post('/logout',(req,res)=>{
    const session=token(req);if(session)store.logout(session);
    res.clearCookie(COOKIE,{httpOnly:true,sameSite:'strict',secure:req.secure,path:'/'});res.json({success:true});
  });
  router.put('/progress',(req,res)=>{
    const user=store.identify(token(req));
    if(!user||req.body.username!==user.username) return res.status(401).json({message:'Sign in to save your progress.'});
    try {res.json(store.save(user.id,req.body.revision,req.body.snapshot));}
    catch(err){
      if(err instanceof AccountError&&err.status===409) return res.status(409).json({message:err.message,...store.progress(user.id)});
      fail(res,err);
    }
  });
  return router;
}
