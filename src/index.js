import daily from "../daily_messages.json";

const MILESTONES = [3,7,14,30,90,180,365];
const SOS = [
"🆘 Давай переживём эту волну вместе. Отложи решение на 10 минут, выпей воды и смени место. Ты не обязан действовать по первому импульсу. Сатошибтв рядом и верит в тебя!!",
"❤️ Поставь обе стопы на пол. Вдохни на 4 счёта, мягко выдохни на 6. Повтори пять раз. Сейчас задача — только пережить ближайшие минуты.",
"🌿 Накат — это ощущение, а не приказ. Отойди от места, где обычно куришь, выпей воды или пожуй жвачку. Эта волна пройдёт."
];
const menu = {keyboard:[
[{text:"📊 Моя статистика и экономия"}],[{text:"🏆 Топ-5 рейтинга"}],
[{text:"🆘 SOS / Накатывает тяга"}],[{text:"🔄 Я сорвался / Сбросить счётчик"}],
[{text:"♻️ Перерегистрироваться"}]],resize_keyboard:true};
const inline = rows => ({inline_keyboard:rows});
const btn = (text,callback_data)=>({text,callback_data});
const nowISO=()=>new Date().toISOString();
const localDay=()=>new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Omsk",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
async function tg(env,method,body){
 const r=await fetch(`https://api.telegram.org/bot${env.BOT_TOKEN}/${method}`,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
 const j=await r.json(); if(!j.ok) throw new Error(j.description||"Telegram API error"); return j.result;
}
async function say(env,id,text,extra={}){return tg(env,"sendMessage",{chat_id:id,text,...extra});}
async function getUser(env,id){return env.DB.prepare("SELECT * FROM users WHERE telegram_id=?").bind(String(id)).first();}
async function setState(env,id,state,data={}){await env.DB.prepare("INSERT OR REPLACE INTO states(telegram_id,state,data) VALUES(?,?,?)").bind(String(id),state,JSON.stringify(data)).run();}
async function getState(env,id){const x=await env.DB.prepare("SELECT * FROM states WHERE telegram_id=?").bind(String(id)).first();return x?{state:x.state,data:JSON.parse(x.data)}:null;}
async function clearState(env,id){await env.DB.prepare("DELETE FROM states WHERE telegram_id=?").bind(String(id)).run();}
function parseNum(v,max=1e6){const n=Number(String(v||"").replace(",","."));return Number.isFinite(n)&&n>0&&n<=max?n:null;}
function stats(u){
 const sec=Math.max(0,(Date.now()-new Date(u.start_at).getTime())/1000),days=Math.floor(sec/86400);
 const hours=Math.floor(sec%86400/3600),minutes=Math.floor(sec%3600/60),d=sec/86400;
 if(u.nicotine_type==="vape")return {days,hours,minutes,money:(u.liquid_price/u.liquid_days+u.cartridge_price/u.cartridge_days)*d,liquid:d/u.liquid_days,carts:d/u.cartridge_days};
 const cigs=Math.floor(Number(u.cigarettes_per_day||0)*d);
 return {days,hours,minutes,money:(u.pack_price/20)*u.cigarettes_per_day*d,cigs,saved:cigs*11};
}
function dailyText(day,type){
 if(type==="vape"){
  const item=daily[Math.min(day,400)-1]||daily[399];
  const support=item.text.split("\n\n").at(-1);
  const prompts=["Ты не обязан справляться со всем будущим сразу. Просто выбери сегодня не возвращаться к привычке.","Тяга может появиться и исчезнуть. Это не приказ — дай ей время пройти.","Каждый день без никотина — твой выбор в пользу свободы.","Если сегодня трудно, сделай паузу, выпей воды и переключись на несколько минут."];
  return `💨 День ${day} без вейпа\n\n${prompts[(day-1)%prompts.length]}\n\n${support}`;
 }
 if(day<=400){const x=daily[day-1];return `🌱 День ${day} без сигарет · ${x.stage}\n\n${x.text}`;}
 return `🌟 День ${day} без сигарет · Новая свобода\n\nТы прошёл уже ${day} дней. Продолжай заботиться о себе сегодня.\n\n${daily[399].text.split("\n\n").at(-1)}`;
}
async function askRegistration(env,chatId,userId,existing=false){
 await setState(env,userId,"type",{existing});
 await say(env,chatId,"Выбери, от чего начинаешь отказываться:",{reply_markup:inline([[btn("🚬 Сигареты","type_cigarettes")],[btn("💨 Вейп","type_vape")]])});
}
async function finishReg(env,chatId,userId,data,username){
 const now=nowISO(), old=await getUser(env,userId);
 if(old) await env.DB.prepare("UPDATE attempts SET ended_at=? WHERE telegram_id=? AND ended_at IS NULL").bind(now,String(userId)).run();
 await env.DB.prepare(`INSERT INTO users(telegram_id,username,nickname,nicotine_type,cigarettes_per_day,pack_price,liquid_price,cartridge_price,cartridge_days,liquid_days,start_at,registered_at,active,last_daily_sent)
 VALUES(?,?,?,?,?,?,?,?,?,?,?,?,1,NULL)
 ON CONFLICT(telegram_id) DO UPDATE SET username=excluded.username,nickname=excluded.nickname,nicotine_type=excluded.nicotine_type,cigarettes_per_day=excluded.cigarettes_per_day,pack_price=excluded.pack_price,liquid_price=excluded.liquid_price,cartridge_price=excluded.cartridge_price,cartridge_days=excluded.cartridge_days,liquid_days=excluded.liquid_days,start_at=excluded.start_at,active=1,last_daily_sent=NULL`)
 .bind(String(userId),username||null,data.nickname,data.type,data.cigs||0,data.pack||0,data.liquid||null,data.cart||null,data.cartDays||null,data.liquidDays||null,now,old?.registered_at||now).run();
 await env.DB.prepare("DELETE FROM achievements WHERE telegram_id=?").bind(String(userId)).run();
 await env.DB.prepare("INSERT INTO attempts(telegram_id,started_at) VALUES(?,?)").bind(String(userId),now).run();
 await clearState(env,userId);
 await say(env,chatId,"Отсчёт начался! ❤️\n\nСегодня — твой первый шаг. Просто проживи сегодняшний день без никотина. Я верю в тебя!",{reply_markup:menu});
 if(!old && env.ADMIN_ID) try{await say(env,env.ADMIN_ID,`🆕 Новый участник!\nТип: ${data.type==="vape"?"Вейп":"Сигареты"}\nНик: ${data.nickname}\nTelegram ID: ${userId}\nUsername: ${username?"@"+username:"не указан"}`)}catch{}
}
async function callback(env,q){
 const id=q.from.id,chat=q.message.chat.id,data=q.data;
 if(data==="type_cigarettes"||data==="type_vape"){
  const s=await getState(env,id);if(!s)return;
  await setState(env,id,"nickname",{...s.data,type:data==="type_vape"?"vape":"cigarettes"});
  await tg(env,"editMessageText",{chat_id:chat,message_id:q.message.message_id,text:"Придумай никнейм (2–24 символа). Он будет виден в рейтинге."});
 }else if(data==="confirm_start"){
  const s=await getState(env,id);if(!s||s.state!=="confirm")return;
  await finishReg(env,chat,id,s.data,q.from.username);
  await tg(env,"editMessageText",{chat_id:chat,message_id:q.message.message_id,text:"Твой отсчёт начался! ❤️"});
 }else if(data==="reset_yes"){
  const now=nowISO();await env.DB.prepare("UPDATE attempts SET ended_at=? WHERE telegram_id=? AND ended_at IS NULL").bind(now,String(id)).run();
  const u=await getUser(env,id);if(u){await env.DB.prepare("UPDATE users SET start_at=?,active=1,last_daily_sent=NULL WHERE telegram_id=?").bind(now,String(id)).run();await env.DB.prepare("INSERT INTO attempts(telegram_id,started_at) VALUES(?,?)").bind(String(id),now).run();}
  await tg(env,"editMessageText",{chat_id:chat,message_id:q.message.message_id,text:"❤️ Начинаем заново. Прошлый опыт остаётся частью твоей истории."});await say(env,chat,"Твой новый отсчёт начался. Я рядом!",{reply_markup:menu});
 }else if(data==="reset_no"||data==="broadcast_cancel"||data==="admin_reset_cancel"){
  await tg(env,"editMessageText",{chat_id:chat,message_id:q.message.message_id,text:"Действие отменено."});await clearState(env,id);
 }else if(data==="broadcast_confirm"&&String(id)===String(env.ADMIN_ID)){
  const s=await getState(env,id);if(!s?.data?.text)return;
  await tg(env,"editMessageText",{chat_id:chat,message_id:q.message.message_id,text:"Рассылка выполняется..."});
  let sent=0,failed=0,offset=0;
  while(true){
   const page=await env.DB.prepare("SELECT telegram_id FROM users WHERE active=1 ORDER BY telegram_id LIMIT 100 OFFSET ?").bind(offset).all();
   if(!page.results.length)break;
   for(const u of page.results){try{await say(env,u.telegram_id,s.data.text);sent++}catch{failed++}}
   offset+=page.results.length;
   if(page.results.length<100)break;
  }
  await clearState(env,id);await say(env,chat,`📬 Рассылка завершена.\nУспешно: ${sent}\nНе доставлено: ${failed}`);
 }else if(data==="admin_reset_confirm"&&String(id)===String(env.ADMIN_ID)){
  await env.DB.batch([env.DB.prepare("DELETE FROM achievements"),env.DB.prepare("DELETE FROM attempts"),env.DB.prepare("DELETE FROM states"),env.DB.prepare("DELETE FROM users")]);
  await tg(env,"editMessageText",{chat_id:chat,message_id:q.message.message_id,text:"База пользователей очищена. Структура сохранена."});
 }
 await tg(env,"answerCallbackQuery",{callback_query_id:q.id});
}
async function message(env,m){
 const id=m.from.id,chat=m.chat.id,text=(m.text||"").trim(),user=await getUser(env,id);
 if(text==="/start"){if(user?.start_at){await clearState(env,id);return say(env,chat,`С возвращением, ${user.nickname}! ❤️ Ты продолжаешь свой путь.`,{reply_markup:menu});}return askRegistration(env,chat,id,!!user);}
 if(text==="♻️ Перерегистрироваться")return askRegistration(env,chat,id,!!user);
 if(text==="/cancel"){await clearState(env,id);return say(env,chat,"Отменено.");}
 if(text==="/broadcast"&&String(id)===String(env.ADMIN_ID)){await setState(env,id,"broadcast",{});return say(env,chat,"Напиши текст рассылки. Для отмены /cancel");}
 if(text==="/admin"&&String(id)===String(env.ADMIN_ID)){const r=await env.DB.prepare("SELECT COUNT(*) total,SUM(active) active FROM users").first();return say(env,chat,`🛠 Всего: ${r.total||0}\nАктивных: ${r.active||0}`);}
 if(text==="/reset_users"&&String(id)===String(env.ADMIN_ID))return say(env,chat,"⚠️ Удалить всех пользователей, регистрации и историю?",{reply_markup:inline([[btn("🗑 Да, очистить","admin_reset_confirm")],[btn("❌ Отмена","admin_reset_cancel")]])});
 const s=await getState(env,id);
 if(s){
  const d=s.data;
  if(s.state==="broadcast"&&String(id)===String(env.ADMIN_ID)){await setState(env,id,"broadcast_confirm",{text});return say(env,chat,`Предпросмотр:\n\n${text}\n\nОтправить всем?`,{reply_markup:inline([[btn("📨 Отправить всем","broadcast_confirm")],[btn("❌ Отмена","broadcast_cancel")]])});}
  if(s.state==="nickname"){if(text.length<2||text.length>24)return say(env,chat,"Никнейм должен быть от 2 до 24 символов.");d.nickname=text;const next=d.type==="vape"?"liquid":"cigs";await setState(env,id,next,d);return say(env,chat,next==="liquid"?"Сколько стоит бутылка жидкости? Введи сумму числом.":"Сколько сигарет в среднем выкуривал(а) за день?");}
  const fields={cigs:["pack","Сколько стоит пачка сигарет?",100],pack:["confirm","",1e6],liquid:["cart","Сколько стоит один картридж?",1e6],cart:["cartDays","На сколько дней хватает одного картриджа?",3650],cartDays:["liquidDays","На сколько дней хватает одной бутылки жидкости?",3650],liquidDays:["confirm","",3650]};
  if(fields[s.state]){
   const [next,prompt,max]=fields[s.state];
   if(s.state==="confirm"){} 
   else {const n=parseNum(text,max);if(!n)return say(env,chat,`Введи положительное число (максимум ${max}).`);if(s.state==="cigs")d.cigs=n;if(s.state==="pack")d.pack=n;if(s.state==="liquid")d.liquid=n;if(s.state==="cart")d.cart=n;if(s.state==="cartDays")d.cartDays=n;if(s.state==="liquidDays")d.liquidDays=n;}
   if(next!=="confirm"){await setState(env,id,next,d);return say(env,chat,prompt);}
   await setState(env,id,"confirm",d);
   const details=d.type==="vape"?`Тип: Вейп\nНик: ${d.nickname}\nЖидкость: ${d.liquid} (на ${d.liquidDays} дней)\nКартридж: ${d.cart} (на ${d.cartDays} дней)`:`Тип: Сигареты\nНик: ${d.nickname}\nСигарет в день: ${d.cigs}\nЦена пачки: ${d.pack}`;
   return say(env,chat,`Проверь данные:\n\n${details}\n\nНажми «Да», чтобы начать отсчёт.`,{reply_markup:inline([[btn("Да","confirm_start")]])});
  }
 }
 if(text==="📊 Моя статистика и экономия"){
  if(!user?.start_at)return say(env,chat,"Сначала заверши регистрацию командой /start.");
  const a=stats(user),milestones=MILESTONES.filter(x=>a.days>=x);
  for(const x of milestones)await env.DB.prepare("INSERT OR IGNORE INTO achievements(telegram_id,milestone,earned_at) VALUES(?,?,?)").bind(String(id),x,nowISO()).run();
  const achievements=milestones.length?milestones.join(", ")+" дней":"пока впереди";
  const out=user.nicotine_type==="vape"?`📊 Статистика ${user.nickname}\n\n💨 Без вейпа: ${a.days} дн. ${a.hours} ч. ${a.minutes} мин.\n💰 Сэкономлено: ${a.money.toFixed(2)}\n🧴 Не использовано жидкости: ${a.liquid.toFixed(2)} бутылки (оценка)\n🔋 Избежано покупок картриджей: ${a.carts.toFixed(2)} (оценка)\n🏅 Достижения: ${achievements}`:`📊 Статистика ${user.nickname}\n\n🌱 Без сигарет: ${a.days} дн. ${a.hours} ч. ${a.minutes} мин.\n🚭 Не выкурено: ${a.cigs}\n💰 Сэкономлено: ${a.money.toFixed(2)}\n⏳ Возвращено времени: ${Math.floor(a.saved/60)} ч. ${a.saved%60} мин.\n🏅 Достижения: ${achievements}`;
  return say(env,chat,out,{reply_markup:menu});
 }
 if(text==="🏆 Топ-5 рейтинга"){
  const r=await env.DB.prepare("SELECT nickname,nicotine_type,start_at FROM users WHERE active=1 AND start_at IS NOT NULL ORDER BY start_at ASC LIMIT 5").all();
  if(!r.results.length)return say(env,chat,"Пока рейтинг пуст. Ты можешь стать одним из первых участников! ❤️",{reply_markup:menu});
  const lines=r.results.map((u,i)=>`${i+1}. ${u.nickname} — ${Math.floor((Date.now()-new Date(u.start_at))/86400000)} дн. ${u.nicotine_type==="vape"?"без вейпа":"без сигарет"}`);
  return say(env,chat,"🏆 Топ-5 участников\n\n"+lines.join("\n"),{reply_markup:menu});
 }
 if(text==="🆘 SOS / Накатывает тяга")return say(env,chat,SOS[Math.floor(Math.random()*SOS.length)],{reply_markup:menu});
 if(text==="🔄 Я сорвался / Сбросить счётчик")return say(env,chat,"Если готов начать новый отсчёт, подтверди. Предыдущая попытка останется в истории.",{reply_markup:inline([[btn("Да, начать заново","reset_yes"),btn("Отмена","reset_no")]])});
}
async function dailyJob(env){
 const today=localDay();let sent=0,failed=0;
 const rows=await env.DB.prepare("SELECT * FROM users WHERE active=1 AND start_at IS NOT NULL AND (last_daily_sent IS NULL OR last_daily_sent<>?)").bind(today).all();
 for(const u of rows.results){
  const day=Math.floor((Date.now()-new Date(u.start_at).getTime())/86400000)+1;
  try{await say(env,u.telegram_id,dailyText(day,u.nicotine_type));await env.DB.prepare("UPDATE users SET last_daily_sent=? WHERE telegram_id=?").bind(today,u.telegram_id).run();sent++;}
  catch{failed++;if(env.ADMIN_ID)try{await say(env,env.ADMIN_ID,`⚠️ Не удалось отправить ежедневное сообщение пользователю ${u.telegram_id}`)}catch{}}
 }
 if(env.ADMIN_ID)try{await say(env,env.ADMIN_ID,`Ежедневная рассылка завершена. Успешно: ${sent}, ошибки: ${failed}.`)}catch{}
}
export default {
 async fetch(request,env){
  if(request.method!=="POST")return new Response("No Smoking Area webhook is running");
  const secret=request.headers.get("X-Telegram-Bot-Api-Secret-Token");
  if(env.WEBHOOK_SECRET&&secret!==env.WEBHOOK_SECRET)return new Response("Forbidden",{status:403});
  const update=await request.json();
  try{if(update.callback_query)await callback(env,update.callback_query);else if(update.message)await message(env,update.message);}catch(e){console.error(e);if(update.message)try{await say(env,update.message.chat.id,"Произошла ошибка. Попробуй ещё раз или отправь /start.");}catch{}}
  return new Response("ok");
 },
 async scheduled(event,env,ctx){ctx.waitUntil(dailyJob(env));}
};
