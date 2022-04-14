/* tslint:disable:max-line-length */
const QMenuIcon = 'https://qmenu.us/assets/icons/icon_72x72.png';
const Style = `<style type="text/css">.qmenu-tpl-body{font-size:14px;padding:30px 5%;background: aliceblue;}.qmenu-tpl-body .qmenu{color:#000;margin-bottom:10px;font-size:48px;border-bottom:5px solid #000;}.qmenu-tpl-body .qmenu img{width:54px;height:54px;float:right;}.qmenu-tpl-body .address{color:gray;font-size:12px;}.qmenu-tpl-body .section,.qmenu-tpl-body .article{color:#000;}.qmenu-tpl-body .section{margin:2em 0;}.qmenu-tpl-body .section div{margin-bottom:2px;}.qmenu-tpl-body .article h4{text-align:center;}.qmenu-tpl-body .underline{text-decoration:underline;white-space:pre;}</style>`;
const Header = `<header><div class="qmenu"><span>qMenu Inc.</span><img src="${QMenuIcon}"/></div><div class="address">107 Technology Pkwy NW Suite 211</div><div class="address">Peachtree Corners, GA 30092</div><div class="address">404-382-9768 (Phone)</div><div class="address">978-652-9542 (SMS)</div><div class="address"><a target="_blank" href="mailto:support@qmenu360.com">support@qmenu360.com</a></div></header>`;
const Address = `<div class="section"><div>{{RT_NAME}}</div><div>{{RT_STREET}}</div><div>{{RT_CITY}}</div></div>`;
const EnglishRevisedOnlineServicesAgreement = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Revised Online Services Agreement</title>${Style}</head><body><div class="qmenu-tpl-body">${Header}${Address}<div class="article"><h4>AGREEMENT FOR ONLINE SERVICES</h4><p>Dear representative of : <span class="underline">  {{RT_NAME}}  </span></p><p>We are pleased to enter into this agreement with <span class="underline">  {{RT_NAME}}  </span> (“Restaurant”) to facilitate the Restaurant’s online purchase orders.  We look forward to assisting the Restaurant grow its business through a robust online presence.  Below are the terms and conditions of qMenu’s services.  Upon the Restaurant’s acknowledgement and agreement to the below terms, qMenu will begin to assist the Restaurant’s online purchase orders by creating a unique online landing page from which customers may make online purchase orders directly to the Restaurant.  The below terms are conditioned on successful completion of a test order by qMenu from the landing page.</p><p>Upon successful completion of a test order, qMenu will charge for its services according to the fee structure that the parties previously agreed to by telephone, email or SMS (with such fees to be modified by mutual agreement of the parties).  Fees shall be paid as follows:</p><p>{{OPTION_ONE_CHECK}} (Option 1) qMenu will invoice the Restaurant monthly.  The restaurant shall have ten (10) days to pay the invoice from the date of receipt.  In the event that an invoice is not paid within ten (10) days, qMenu may charge interest on the invoice of 1.5% per day.  qMenu may discontinue servicing the online landing page at any time without notice in the event that an invoice is delinquent.</p><p>{{OPTION_TWO_CHECK}} (Option 2) qMenu will collect online order payments directly from the Restaurant’s customers.  qMenu shall provide the Restaurant with semi-monthly payouts from qMenu equal to the amount collected minus the commissions, fees and prior debts as applicable.</p><p>The Restaurant acknowledges that the service fees specified herein may be modified in the future by mutual agreement of the parties and that if new services are released by qMenu, they may come with new or different pricing structures. qMenu will make a reasonable attempt to notify the Restaurant of new services when they become available.</p><p>The Restaurant agrees that in order to more effectively promote the Restaurant’s business online (including adding qMenu’s online ordering link to the Restaurant’s Google My Business listing, or “GMB”), the Restaurant shall grant qMenu permission to own and manage the Restaurant’s GMB, and to modify GMB online ordering links, including removal or re-prioritization of GMB ordering links for entities other than qMenu.  Restaurant retains the right to have ownership and management of the Restaurant’s GMB returned to the Restaurant, or transferred to any other person or business designated by the Restaurant at any time.</p><p>In the event of any dispute between the parties, the Restaurant consents to exclusive jurisdiction in state or federal court serving Gwinnett County, Georgia.  This agreement shall also be governed by Georgia law (exclusive of Georgia’s conflict of law rules).  Either party may terminate this agreement without cause upon thirty (30) days’ written notice.</p></div><div class="section"><div>ACKNOWLEDGED AND AGREED:</div><div>{{RT_NAME}}</div><div>By: <span class="underline">  %%SIGNATURE%%  </span></div><div>Name: <span class="underline">  %%FULL_NAME%%  </span></div><div>Title: <span class="underline">  %%POSITION%%  </span></div></div></div></body></html>`;
const FirstDelinquentNotice = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>First Delinquent Notice</title>${Style}</head><body><div class="qmenu-tpl-body">${Header}${Address}<div class="article"><h4>DELINQUENT NOTICE</h4><p>Dear representative of : <span class="underline">  {{RT_NAME}}  </span></p><p>As you are aware, since <span class="underline">  {{RT_OPEN_DATE}}  </span>, qMenu has facilitated <span class="underline">  {{RT_NAME}}  </span>’s (“Restaurant”) online purchase orders. The Restaurant agreed to certain terms and conditions as set forth in the Agreement For Online Services.<p>Since <span class="underline">  {{EARLIEST_UNPAID_INVOICE_DUE_DATE}}  </span>, the Restaurant has failed to make payment for online purchase orders.  Included herein are the transaction details for each order placed and the corresponding amount owed.</p><p>qMenu requests that the Restaurant brings its account current by <span class="underline">  {{NOTICE_DUE_DATE}}  </span>.  qMenu reserves the right to discontinue its online services (if not already done so) and take further action to collect upon the amounts owed in the event that the Restaurant fails to make full payment.</p><p>We very much value your business and trust that you recognize the tremendous benefits that qMenu brings to the Restaurant’s bottom line.  We look forward to a continued mutually beneficial business relationship.</p><p>Please do not hesitate to contact us to discuss any question or concern regarding this correspondence.</p></div><div class="section"><div>Sincerely yours,</div><div>qMenu, Inc.</div></div></div></body></html>`;
const SecondDelinquentNotice = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Second Delinquent Message</title>${Style}</head><body><div class="qmenu-tpl-body">${Header}${Address}<div class="article"><h4>SECOND DELINQUENT NOTICE</h4><p>Dear representative of : <span class="underline">  {{RT_NAME}}  </span></p><p>This law firm represents qMenu, Inc. As you are aware, since <span class="underline">  {{RT_OPEN_DATE}}  </span>, qMenu has facilitated <span class="underline">  {{RT_NAME}}  </span>’s (“Restaurant”) online purchase orders.  The Restaurant agreed to certain terms and conditions as set forth in the Agreement For Online Services.<p>Since <span class="underline">  {{EARLIEST_UNPAID_INVOICE_DUE_DATE}}  </span>, the Restaurant has failed to make payment for online purchase orders facilitated by qMenu.  On <span class="underline">  %%FIRST_DELINQUENT_NOTICE_SENT_ON%%  </span>, qMenu sent to the Restaurant its first Delinquent Notice.  The first Delinquent Notice also included the transaction history detailing the amount due to qMenu.</p><p>If the Restaurant does not bring its account current by <span class="underline">  {{NOTICE_DUE_DATE}}  </span>, qMenu will discontinue its online services to the Restaurant (if not already discontinued) and pursue all remedies against the Restaurant, including commencing a lawsuit against the Restaurant or referring this matter to a collection agency.</p><p>Please be advised that we have referred this matter to our legal counsel, Weinberg Wheeler Hudgins Gunn and Dial, who will be in contact with you should you fail to satisfy your payment obligations to qMenu, Inc. Please forward any check payments to the address listed below.</p><p>Please do not hesitate to contact us to discuss any question or concern regarding this correspondence.</p><div><div class="address">qMenu, Inc.</div><div class="address">7778 McGinnis Ferry Rd, Suite 276</div><div class="address">Suwanee, GA 30024</div></div></div><div class="section"><div>Sincerely yours,</div><div>qMenu, Inc.</div></div></div></body></html>`;
const ChineseRevisedOnlineServicesAgreement = `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport"content="width=device-width, initial-scale=1"><title>中文修订在线服务协议</title>${Style}</head><body><div class="qmenu-tpl-body">${Header}${Address}<div class="article"><h4>网上服务授权书</h4><p>尊敬的商家朋友:<span class="underline">{{RT_NAME}}</span></p><p>我们很高兴与<span class="underline">{{RT_NAME}}</span>“餐厅”）签订此协议，以促进餐厅的在线点餐。我们期待通过我们的推广提高餐馆的订单量。以下是qMenu服务的条款和合约。在餐厅确认并同意以下条款后，qMenu将开始通过创建一个独特的在线登录页面，完成餐厅的在线订单，客户可以通过该页面直接向餐厅点餐。qMenu在成功完成测试订单的同时发送此条约。</p><p>qMenu将根据双方先前通过电话、电子邮件或短信的方式和商家谈好合作的佣金模式对其收取费用（该费用由双方共同协商修改）。费用应按以下方式支付：</p><p>{{OPTION_ONE_CHECK}}（选项1）qMenu将每月向餐厅发送账单。从收到账单那天起，餐厅在10天内支付账单。如果不能如期付款，qMenu将会收取每天1.5%的利息。如果一再拖欠支付佣金，qMenu可能会随时停止其在线点餐服务，恕不另行通知。</p><p>{{OPTION_TWO_CHECK}}（选项2）qMenu将餐馆自收客人点餐费更新为qMenu代收，减去所欠的所有佣金以及qMenu代收后产生的所有订单的佣金和刷卡费，余额将direct deposit给商家，佣金付清后，然后可以由商家决定转换成商家自收或继续让qMenu代收。</p><p>餐厅承认，本协议规定的服务费将来可能会根据双方的共同协议进行修改，并且如果qMenu发布新的服务项目，佣金模式可能也会随之更新。qMenu将会制定出合理的收费方式并通知餐厅。</p><p>餐厅同意，为了更有效地促进餐厅的在线业务（包括将qMenu的在线订购链接添加到餐厅的Google My Business列表，或“GMB”），餐厅应授予qMenu管理餐厅的GMB权限。餐厅也允许qMenu修改餐厅的GMB在线点餐链接，包括添加和删除qMenu以外的平台的网站以及链接为主网或次网。餐厅保留随时将餐厅的GMB的所有权和管理权归还给餐厅，或转让给餐厅指定的任何其他人或平台的权利。</p><p>如果双方之间发生任何争议，餐厅同意接受为佐治亚州Gwinnett（格威内特）县服务的州或联邦法院的专属管辖权。本协议还应受乔治亚州法律的管辖（不包括乔治亚州的法律冲突规则）。任何一方均可在提前三十(30)天书面通知后无故终止本协议。</p></div><div class="section"><div>承认并同意：</div><div>{{RT_NAME}}</div><div>电子签名：<span class="underline">%%SIGNATURE%%</span></div><div>姓名：<span class="underline">%%FULL_NAME%%</span></div><div>职位：<span class="underline">%%POSITION%%</span></div></div></div></body></html>`

export {
  EnglishRevisedOnlineServicesAgreement, FirstDelinquentNotice, SecondDelinquentNotice, ChineseRevisedOnlineServicesAgreement
};
