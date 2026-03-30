import{j as l}from"./vendor-radix-jNvT1O4E.js";import{c as s,u as o}from"./index-DpUYsooq.js";import{e as t,C as i}from"./AuthenticatedApp-CGEtnRuv.js";/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const c=[["path",{d:"m16 3 4 4-4 4",key:"1x1c3m"}],["path",{d:"M20 7H4",key:"zbl0bi"}],["path",{d:"m8 21-4-4 4-4",key:"h9nckh"}],["path",{d:"M4 17h16",key:"g4d7ey"}]],r=s("arrow-right-left",c);/**
 * @license lucide-react v0.487.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=[["circle",{cx:"12",cy:"12",r:"10",key:"1mglay"}],["path",{d:"m4.9 4.9 14.2 14.2",key:"1m5liu"}]],d=s("ban",m);function u(){const{schedulingPolicies:e}=o(),n=[{icon:t,label:"Weekly Limit",value:`${e.weeklyLimit} per member`},{icon:i,label:"Monthly Limit",value:`${e.monthlyLimit} per member`},{icon:d,label:"Same-Day",value:e.allowSameDayAssignments?"Allowed":"Not Allowed",warn:!e.allowSameDayAssignments},{icon:r,label:"Consecutive Days",value:e.allowConsecutiveDayAssignments?"Allowed":"Not Allowed",warn:!e.allowConsecutiveDayAssignments}];return l.jsxs("div",{className:"rounded-[10px] px-4 py-2.5 flex flex-wrap items-center gap-x-5 gap-y-1.5",style:{backgroundColor:"#F8F9FB",border:"1px solid #E5E7EB"},children:[l.jsx("span",{className:"text-[11px] font-semibold uppercase tracking-wide text-neutral-500 mr-1",children:"Active Policies"}),n.map(a=>l.jsxs("div",{className:"flex items-center gap-1.5 text-[12px]",children:[l.jsx(a.icon,{className:"h-3.5 w-3.5 flex-shrink-0",style:{color:a.warn?"#EF4444":"#6B7280"}}),l.jsxs("span",{className:"text-neutral-500",children:[a.label,":"]}),l.jsx("span",{className:"font-medium",style:{color:a.warn?"#EF4444":"#1F2937"},children:a.value})]},a.label))]})}export{r as A,u as P};
