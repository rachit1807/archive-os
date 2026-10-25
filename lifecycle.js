const conditions=['Excellent','Good','Fair','Needs care'];
export function transition(item,input){
 if(!input||typeof input!=='object')throw Error('Choose an object action');
 const text=(key,max=500)=>{const value=input[key]??'';if(typeof value!=='string'||value.length>max)throw Error(`Invalid ${key}`);return value.trim();};
 const action=input.action,note=text('note');const next={...item,history:[...(item.history||[])]};const event={action,at:new Date().toISOString(),note};
 if(action==='Located'){const location=text('location',100);if(!location)throw Error('Assign a physical location first');if(item.borrower)throw Error('Receive this object before changing its location');next.location=location;event.location=location;}
 else if(action==='Lent'){if(item.borrower)throw Error('This object is already on loan');if(!item.location)throw Error('Assign a home location before lending');if(item.condition==='Needs care')throw Error('Inspect and resolve the condition before lending');const borrower=text('borrower',100),due=text('due',10);if(!borrower||!/^\d{4}-\d{2}-\d{2}$/.test(due)||Number.isNaN(Date.parse(due))||new Date(due).toISOString().slice(0,10)!==due)throw Error('Enter a borrower and valid return date');next.borrower=borrower;next.due=due;event.borrower=borrower;event.due=due;event.condition=item.condition;}
 else if(action==='Returned'){if(!item.borrower)throw Error('This object is not on loan');const condition=text('condition',30),location=text('location',100);if(!conditions.includes(condition)||!location)throw Error('Inspect its condition and confirm where it is stored');event.borrower=item.borrower;event.condition=condition;event.location=location;next.borrower='';next.due='';next.condition=condition;next.location=location;}
 else if(action==='Inspected'){if(item.borrower)throw Error('Receive this object before inspecting it');const condition=text('condition',30);if(!conditions.includes(condition))throw Error('Choose a valid condition');next.condition=condition;event.condition=condition;}
 else throw Error('Unknown object action');
 next.history.push(event);next.updatedAt=event.at;return next;
}
