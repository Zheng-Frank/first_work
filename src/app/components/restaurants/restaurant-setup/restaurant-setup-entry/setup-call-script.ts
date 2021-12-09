// do a call script in basic setup section to make saleperson work quickly
const basicSectionExplanations = {
  ChineseExplanations: {
    open_remark: "您好，我是qMenu客服[XXX]，首先再次感谢您选择加入我们的平台！现在准备帮您设置您帐户，该只需要几分钟。首先跟您确认一些基本信息，好吗？您的餐馆名称和地址是 [XXX] 和 [XXX]，对吗？",
    rt_phone_inquiry: "您的主餐馆电话号码是[XXX]，对吗？",
    name_inquiry: "请问，该怎么称呼您？是[XXX]先生/女士吗？ 您是餐馆的老板还是经理呢？",
    cell_phone_inquiry: "请问，您手机号码是多少呢？",
    pickup_inquiry: "请问，你们从收到新订单通知的时候直到做好菜通常需要多久呢？（不确定的话建议写20分钟，这是我们给大部分餐馆填的数字）",
    web_inquiry: "看起来你们餐馆已经有自己的网站，路由是[XXX]，对吗？",
    tax_rate_inquiry: "请问，您当地的销售税率是多少？ 如果您不确定，我也可以帮您查一下。"
  },
  EnglishExplanations: {
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
const menuSectionExplanations = {
  ChineseExplanations: {
    menu_inquiry: "好的，现在准备设置您的菜单。 您准备向我们发送菜单图片，还是想让我们从另一个平台直接复制菜单呢？"
  },
  EnglishExplanations: {
    menu_inquiry: "Now, let's make sure we have an up-to-date menu for your restaurant. Can you provide us with photos of your menu, or should we copy the menu from another existing platform?"
  }
}
export {
  basicSectionExplanations, menuSectionExplanations
};
