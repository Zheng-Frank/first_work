// do a call script in basic setup section to make saleperson work quickly
const basicSectionCallScript = {
  ChineseCallScript: {
    open_remark: "您好，我是qMenu客服[XXX]，首先再次感谢您选择加入我们的平台！现在准备帮您设置您帐户，该只需要几分钟。首先跟您确认一些基本信息，好吗？您的餐馆名称和地址是 [XXX] 和 [XXX]，对吗？",
    rt_phone_inquiry: "您的主餐馆电话号码是[XXX]，对吗？",
    name_inquiry: "请问，该怎么称呼您？是[XXX]先生/女士吗？ 您是餐馆的老板还是经理呢？",
    cell_phone_inquiry: "请问，您手机号码是多少呢？",
    pickup_inquiry: "请问，你们从收到新订单通知的时候直到做好菜通常需要多久呢？（不确定的话建议写20分钟，这是我们给大部分餐馆填的数字）",
    web_inquiry: "看起来你们餐馆已经有自己的网站，路由是[XXX]，对吗？",
    tax_rate_inquiry: "请问，您当地的销售税率是多少？ 如果您不确定，我也可以帮您查一下。"
  },
  EnglishCallScript: {
    open_remark: "Hello, and thanks again for signing up with qMenu, my name is [XXX], and I’m ready to set up your restaurant's account! It should only take a few minutes. I'll start by confirming a few basic details, OK? Your restaurant name and address are [XXX] and [XXX], is that correct?",
    rt_phone_inquiry: "And your main restaurant’s phone number is [XXX], correct?",
    name_inquiry: "And your name is [XXX]? And are you the owner or manager at the restaurant?",
    cell_phone_inquiry: "And could I get a good cell phone number to put on file for you?",
    pickup_inquiry: "So, how long does it usually take to prepare a new order? (Many restaurants put 20 minutes)",
    web_inquiry: "It looks like your restaurant has an existing website, and it's [XXX], is that right?",
    tax_rate_inquiry: "And what's your local sales tax rate? I can also look it up for you if you're not sure."
  }
}
//do a call script in menu setup section to make saleperson work quickly
const menuSectionCallScript = {
  ChineseCallScript: {
    menu_inquiry: `好的，现在准备设置您的菜单。 您准备向我们发送菜单图片，还是想让我们从另一个平台直接复制菜单呢？
    <br/>-（可以提供一下菜单 URL 地址吗？）
    <br/>-（没问题！您可以通过短信或电子邮件将图片发送给我们，您更方便用哪种方式呢？好的；短信请发送到 978-652-9542，电子邮件请发送到 support@qmenu360.com）`
  },
  EnglishCallScript: {
    menu_inquiry: `Now, let's make sure we have an up-to-date menu for your restaurant. Can you provide us with photos of your menu, or should we copy the menu from another existing platform?
    <br/>- (Is there a URL where your menu is available?)
    <br/>- (Sure! You can send the pictures to us via text or email, which one is more convenient for you? You can send the images via text to 978-652-9542 or via email to support@qmenu360.com.)`
  }
}
//do a call script in hour setup section to make saleperson work quickly
const hoursSectionCallScript = {
  ChineseCallScript: {
    hours_inquiry: `
    好的，我准备跟您确认一下餐馆的营业时间，好吗？[给业主念出从Google抓取的餐馆营业时间]。请问，有什么需要修改的信息吗？
    <br/>- (好的！)
    <br/>- (好的，我现在为您改一下。)`
  },
  EnglishCallScript: {
    hours_inquiry: `
    Ok, now I'm just going to read out your store hours to confirm: [READ OUT STORE HOURS]. Is that correct or do I need to modify anything?
    <br/>- (Ok, perfect!)
    <br/>- (Ok, I'll change that for you now.)`
  }
}
//do a call script in contact setup section to make saleperson work quickly
const contactSectionCallScript = {
  ChineseCallScript: {
    open_remark: '那么，每次从 qMenu 收到新订单时，您希望如何收到通知呢？ 我们提供多种选择，有电话、短信、传真、电子邮件和云打印，您可以选择任何一个或多个选项。',
    bizphone_inquiry: '[XXX] 是您希望收到订单通知的电话号码，对吗？',
    fax_inquiry: '请问，我们应该将订单通知发送到哪个传真号码？',
    email_inquiry: '请问，我们应该将订单通知发送到哪个电子邮箱？',
    cloud_print_inquiry: '至于云打印订单通知，我们一位专门的工作人员稍后会联系您进行设置。',
    cellphone_inquiry: '[XXX] 是您希望收到订单通知的手机号码，对吗？'
  },
  EnglishCallScript: {
    open_remark: 'So, how would you like to be notified each time you get a new order from qMenu? We offer several options including phone call, text message, fax, email, and cloud printing. You can choose any or as many of those options as you like.',
    bizphone_inquiry: 'And is [XXX] the right phone number to call for order notifications?',
    fax_inquiry: 'And which fax number should we send orders to?',
    email_inquiry: 'And which email address should we send orders to?',
    cloud_print_inquiry: 'As for cloud printing notifications, one of our specialists will call you back later to set that up.',
    cellphone_inquiry: 'And is [XXX] the right cell phone number to send text order notifications to?'
  }
}
//do a call script in delivery setup section to make saleperson work quickly
const deliverySectionCallScript = {
  ChineseCallScript: {
    open_remark: '接下来，准备问您几个关于外送服务的问题。',
    offer_inquiry: `
    请问，你们自己提供外送服务吗？
    <br/>- (不提供？没问题！qMenu可以为你们提供！我们只向客户收取1.98 + 基于距离的外送费。我现在可以为你开启。)<span class='text-warning'>[除非餐馆特意要求不开启，否则打开 Postmates服务]</span>
    <br/>- (好的！我们会继续为您配置外送设置。)<span class='text-warning'>[继续询问与自助外送相关的问题]</span>
    `,
    taxable_inquiry: '请问，您所在地区的外送是否应纳税？'
  },
  EnglishCallScript: {
    open_remark: "Now, I'm just going to ask you some questions about delivery. ",
    offer_inquiry: `
    So, may I ask, does your restaurant offer its own delivery services?
    <br/>- (No? Ok, no problem! qMenu can actually facilitate delivery for you! We only charge the customer $1.98 + distance-based delivery fees. I can turn that on for you now.) <span class='text-warning'>[wait for the restaurant to say "please don't", otherwise, turn on Postmates]</span>
    <br/>- (Ok, sounds good! We'll go ahead and set up your delivery settings for you.) <span class='text-warning'>[proceed to ask self-delivery-related questions]</span>
    `,
    taxable_inquiry: 'And is delivery taxable in your area?'
  }
}
//do a call script in pickup payment setup section to make saleperson work quickly
const pickupPaymentCallScript = {
  ChineseCallScript: {
    cash_inquiry: '好的，我们配置一下您的收款设置。 请问，对于取餐订单，您将如何接受付款？ 您接受现金吗？',
    credit_card_inquiry: '信用卡付款，您希望自己收款还是 qMenu 为您安全实时代收呢？',
    rt_collect_inquiry: '好的，您是希望等客户取餐时刷卡，还是我们当客户下单时将信用卡信息发送给您来输入？(或如果您有自己的 Stripe 帐户，我们可以链接到该帐户)'
  },
  EnglishCallScript: {
    cash_inquiry: 'Ok, moving on to payment collection. So, for pickup orders, how will you accept payment? Will you accept cash?',
    credit_card_inquiry: 'And for credit card payments, would you like to collect those yourself or qMenu to collect payment securely online for you?',
    rt_collect_inquiry: 'Alright, so the customer will swipe in person when they get their food, or should we send you the CC number for key-in when they place the order? (Or do you have your own Stripe account that we should link to?)'
  }
}

const deliveryPaymentCallScript = {
  ChineseCallScript: {
    cash_inquiry: '请问，对于外送订单，您将如何接受付款？ 您接受现金吗？',
    credit_card_inquiry: '信用卡付款，您希望自己收款还是 qMenu 为您安全实时代收呢？',
    rt_collect_inquiry: '好的，您是希望等客户取餐时刷卡，还是我们当客户下单时将信用卡信息发送给您来输入？(或如果您有自己的 Stripe 帐户，我们可以链接到该帐户)',
    qmenu_provide_inquiry: '对于外送订单，根据我们的使用政策并为您提供方便，我们将代您收款。'
  },
  EnglishCallScript: {
    cash_inquiry: 'And for delivery orders, how will you accept payment? Will you accept cash?',
    credit_card_inquiry: 'And for credit card payments, would you like to collect those yourself or qMenu to collect payment securely online for you?',
    rt_collect_inquiry: 'Alright, so the customer will swipe in person when they get their food, or should we send you the CC number for key-in when they place the order? (Or do you have your own Stripe account that we should link to?)',
    qmenu_provide_inquiry: `Just to inform you, as for delivery orders, per our usage policy and for your convenience, we'll be collecting payment on your behalf.`
  }
}
// do a call script in invoicing setup section to make saleperson work quickly
const invoicingSectionCallScript = {
  ChineseCallScript: {
    open_remark: `好的，我们快完成了！ 那么，对于发票，如果 qMenu 收取的付款比您餐馆欠的费用多，我们将每半个月向您发送一次付款。 否则，我们会在每个月末向您发送发票。`,
    receiving_inquiry: '收到来自 qMenu 的付款，您希望如何收到这些付款？ 获得直接存款，还是邮寄支票？',
    send_inquiry: '而如果向 qMenu 付款，您更喜欢哪种方式？ 直接取款，通过信用卡付款，还是寄支票给qMenu呢？',
    recipient_inquiry: '请问，给您开支票时，收款人应该写[XXX]，是不是？ 我们把支票寄到餐馆地址，还是其他地址呢？',
    card_detail_inquiry: '好的，麻烦提供一下您的信用卡详细信息，我们需要记录该付款方式以便到时候付款给您……这里需要卡上的全名、卡号、CVV号（三位数）、和帐单地址',
    bank_detail_inquiry: '好的，如果您不介意的话，麻烦提供一下您的银行账户详细信息……这里需要账户上的名字、路由号、和帐号号码'
  },
  EnglishCallScript: {
    open_remark: `Alright, we're almost done! So, for invoicing, if qMenu collects more in payments than your restaurant owes in fees, we'll send you semi-monthly payouts. Otherwise, we'll just send you an invoice at the end of each month for the fees owed.`,
    receiving_inquiry: 'If receiving a payout from qMenu, how would you like to receive those payouts? Get a direct deposit, or just a check in the mail?',
    send_inquiry: 'And if sending a payment to qMenu, which method would you prefer? Direct withdrawal, paying via credit card, or sending us a check?',
    recipient_inquiry: 'So, when making out a check to you, the payee should be [XXX], right? And we send the checks to the restaurant address, or another address?',
    card_detail_inquiry: `Ok, and if you could provide me with your credit card details so we have that payment method on file……we'll need the name on the card, the card number, CVV number, and billing address`,
    bank_detail_inquiry: `Ok, let me get those bank account details from you if you don't mind… we can start with the name on the account, then I'll need the routing and account numbers`
  }
}

// finalization section means that restaurant setup has finished
const finalSectionCallScript = {
  ChineseCallScript: {
    final_inquiry: `
    好的！ 您的帐户即将准备就绪。 请给我一点时间以确保我们没有遗漏任何东西...... <span class='text-warning'>[访问logs选项卡以检查未完成任务]</span>
    <br/>- (看来你的账户只剩下<span class='text-warning'>[剩下步骤]</span>这几个未完成步骤；一帮您完成后就可以开始接受订单了!)
    <br/>- 我现在准备向您发送一个测试订单，以确保您的订单通知设置已正确配置。 我也会向您发送qMenu的运营协议，可以发送到您的 [XXX] email 地址吗？<span class='text-warning'>[办理试订手续]</span>
    `
  },
  EnglishCallScript: {
    final_inquiry: `
    Perfect! Your account is almost ready. Just give me a moment to make sure I haven't missed anything… <span class='text-warning'>[go to logs tab to check on outstanding tasks]</span>
    <br/>- (It looks like <span class='text-warning'>[PENDING ITEMS]</span> are the only steps left to complete before you can start taking orders!)
    <br/>- Let me send you a quick test order to ensure you’re properly set up to get notifications. I'll also send over our operating agreement, is [XXX] a good email to send it to? <span class='text-warning'>[go through test order procedures]</span>
    `
  }
}

export {
  basicSectionCallScript, menuSectionCallScript, hoursSectionCallScript,
  contactSectionCallScript, deliverySectionCallScript, finalSectionCallScript,
  pickupPaymentCallScript, deliveryPaymentCallScript, invoicingSectionCallScript
};
