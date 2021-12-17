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
    menu_inquiry: `好的，现在准备设置您的菜单。 您准备向我们发送菜单图片，还是想让我们从另一个平台直接复制菜单呢？`,
    upload_image_inquiry: '',
    send_image_inquiry: '',
    copy_inquiry: '',
    provide_url_inquiry: ''
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
    好的，我准备跟您确认一下餐馆的营业时间，好吗？请问，有什么需要修改的信息吗？
    `
  },
  EnglishCallScript: {
    hours_inquiry: `
    Ok, now I'm just going to read out your store hours to confirm. Is that correct or do I need to modify anything?
    `
  }
}
//do a call script in contact setup section to make saleperson work quickly
const contactSectionCallScript = {
  ChineseCallScript: {
    open_remark: '那么，每次从 qMenu 收到新订单时，您希望如何收到通知呢？ 我们提供多种选择，有电话、短信、传真、电子邮件和云打印，您可以选择任何一个或多个选项。',
    bizphone_inquiry: '[XXX] 是您希望收到订单通知的电话号码，对吗？',
    fax_inquiry: '请问，我们应该将订单通知发送到哪个传真号码？',
    email_inquiry: `请问，我们应该将订单通知发送到哪个电子邮箱？<span class='text-warning'>[这将成为餐厅的官方电子邮件或所有者/经理的电子邮件]</span>`,
    cloud_print_inquiry: '至于云打印订单通知，我们一位专门的工作人员稍后会联系您进行设置。',
    cellphone_inquiry: '[XXX] 是您希望收到订单通知的手机号码，对吗？'
  },
  EnglishCallScript: {
    open_remark: 'So, how would you like to be notified each time you get a new order from qMenu? We offer several options including phone call, text message, fax, email, and cloud printing. You can choose any or as many of those options as you like.',
    bizphone_inquiry: 'And is [XXX] the right phone number to call for order notifications?',
    fax_inquiry: 'And which fax number should we send orders to?',
    email_inquiry: `And which email address should we send orders to?<span class='text-warning'>[This can be the restaurant's official email or the owner/manager's email address]</span>`,
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
    taxable_inquiry: '请问，您所在地区的外送是否应纳税？',
    city_zip_inquiry: `是否有一些城市或邮编，您不为它们提供外送服务呢?<span class='text-warning'>[按逗号分隔的格式输入每一个要填入的信息(例如: 30305, Peachtree City, 30342, Decatur)]</span>`,
    estimate_delivery_inquiry: '请问从收到新的外送订单到食品送到客户家门口大约需要多长时间呢？',
    start_time_inquiry: '请问您在什么时候开始接受新的外送订单呢？',
    end_time_inquiry: '请问您在什么时候停止接受新的外送订单呢？',
    delivery_arrange_inquiry: '请问您的配送范围是什么？您收取的配送费用(基于距离)是多少？每个配送范围的最低订单金额是多少？(例如: 1英里/20美元/3美元，2英里/25美元/4.50美元)'
  },
  EnglishCallScript: {
    open_remark: "Now, I'm just going to ask you some questions about delivery. ",
    offer_inquiry: `
    So, may I ask, does your restaurant offer its own delivery services?
    <br/>- (No? Ok, no problem! qMenu can actually facilitate delivery for you! We only charge the customer $1.98 + distance-based delivery fees. I can turn that on for you now.) <span class='text-warning'>[wait for the restaurant to say "please don't", otherwise, turn on Postmates]</span>
    <br/>- (Ok, sounds good! We'll go ahead and set up your delivery settings for you.) <span class='text-warning'>[proceed to ask self-delivery-related questions]</span>
    `,
    taxable_inquiry: 'And is delivery taxable in your area?',
    city_zip_inquiry: `Are there any cities or zip codes to which you do not deliver? <span class='text-warning'>[Enter each one in comma-separated format (e.g.
      30305, Peachtree City, 30342, Decatur)]</span>`,
    estimate_delivery_inquiry: `Approximately how long does it take from when you get a new delivery order to the time the food is delivered to the customer's doorstep?`,
    start_time_inquiry: 'At what time will you start accepting new delivery orders?',
    end_time_inquiry: 'At what time will you stop accepting new delivery orders?',
    delivery_arrange_inquiry: 'What is your delivery range, what delivery fees do you charge (based on distance), and what are the minimum order amounts for each delivery range? (e.g. 1 mile/$20/$3, 2 miles/$25/$4.50).'
  }
}
//do a call script in pickup payment setup section to make saleperson work quickly
const pickupPaymentCallScript = {
  ChineseCallScript: {
    open_remark:'好的，我们配置一下您的收款设置。如果您收取款项，我们将在月底向您开佣金/费用的发票。如果qMenu收取款项，我们将每半个月向您发送所收取资金的支出账单(减去我们的佣金/费用)。',
    cash_inquiry: '请问，对于取餐订单，您将如何接受付款？ 您接受现金吗？',
    credit_card_inquiry: '信用卡付款，您希望自己收款还是 qMenu 为您安全实时代收呢？',
    rt_collect_inquiry: '好的，您是希望等客户取餐时刷卡，还是我们当客户下单时将信用卡信息发送给您来输入？(或如果您有自己的 Stripe 帐户，我们可以链接到该帐户)'
  },
  EnglishCallScript: {
    open_remark:`Ok, moving on to payment collection. If you collect payment, we'll invoice you for commissions/fees owned at the end of the month. If qMenu collects
    payments, we'll send you semi-monthly payouts of the funds collected (minus our commissions/fees).`,
    cash_inquiry: ' So, for pickup orders, how will you accept payment? Will you accept cash?',
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
