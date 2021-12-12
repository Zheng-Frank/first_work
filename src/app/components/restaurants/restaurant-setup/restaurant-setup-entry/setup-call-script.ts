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

export {
  basicSectionCallScript, menuSectionCallScript, hoursSectionCallScript, contactSectionCallScript
};
