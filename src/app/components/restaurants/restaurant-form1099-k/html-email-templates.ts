const Style = `
.qmenu-tpl-body {
    font-size: 14px;
    padding: 30px 5%;
    background: aliceblue;
}

.qmenu-tpl-body .qmenu {
    color: #000;
    margin-bottom: 10px;
    font-size: 48px;
    border-bottom: 5px solid #000;
}

.qmenu-tpl-body .qmenu img {
    width: 54px;
    height: 54px;
    float: right;
}

.qmenu-tpl-body .address {
    color: gray;
    font-size: 12px;
}

.qmenu-tpl-body .section,
.qmenu-tpl-body .article {
    color: #000;
}

.qmenu-tpl-body .section {
    margin: 2em 0;
}

.qmenu-tpl-body .section div {
    margin-bottom: 2px;
}

.qmenu-tpl-body .article h4 {
    text-align: center;
}

.qmenu-tpl-body .underline {
    text-decoration: underline;
    white-space: pre;
}
`
const form1099kEmailTemplate = `
<!DOCTYPE html>
<html>
	<head>
		<meta charset="utf-8">
		<meta name="viewport" content="width=device-width, initial-scale=1">
		<title>Form1099k Email</title>
		<style type="text/css">
        ${Style}
		</style>
	</head>

	<body>
		<div class="qmenu-tpl-body">
			<div class="article">
				<p>Subject : <span class="underline">  1099-K Form for  {{LAST_YEAR}}</span></p>
				<p>Dear : <span class="underline">  {{RT_NAME}}  </span></p>
				<p>
					You have received this 1099-K Form for tax year {{LAST_YEAR}} (attached) because qMenu has collected and disbursed credit card payments 
					for your restaurant during {{LAST_YEAR}} that meet the transaction amount threshold requiring the submission of this form.
					You can visit this website for more information: www.irs.gov/Form1099K.
				</p>
				<p>
					qMenu recommends that all restaurant owners verify the Payee Name, Payee TIN and Address listed on the form.
					 These should match the business name and TIN you use to report taxes to the IRS.
				</p>
				<p>
					If any information is incorrect on this form, please call qMenu as soon as possible so we can make any needed corrections.
				</p>
				<p>
					Customer Support Line: (404) 382-9768
				</p>
			</div>
			<div class="section">
				<div>Sincerely</div>
				<div class="underline">qMenu, Inc.</div>
			</div>
		</div>
	</body>

</html>
`
export {
    form1099kEmailTemplate
}