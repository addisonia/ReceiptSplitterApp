import React from "react";
import {
  Modal,
  StyleSheet,
  View,
  TouchableWithoutFeedback,
} from "react-native";
import { WebView } from "react-native-webview";

const htmlContent = `
 <html>
  <head>
   <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
   <style>
    body {
     background-color: white;
     font-family: Arial, sans-serif;
     padding: 20px;
     font-size: 16px; 
     line-height: 1.5;
     color: #333;
    }
    h1 {
     font-size: 20px; 
     color: #222;
    }
    h2 {
     font-size: 18px;
     color: #222;
    }
    h3 {
     font-size: 16px;
     color: #222;
    }
    p, li {
     font-size: 14px;
    }
    a {
     font-size: 14px;
     color: #0066cc;
     text-decoration: none;
    }
    ul {
      list-style-type: disc; /* Use circle as the list item marker */
      margin-left: 20px; /* Add some left margin to the list */
    }
    table {
      font-size: 10px;
    }
   </style>
  </head>
  <body>
   <h1>PRIVACY POLICY</h1>
   <p>Last updated March 03, 2025</p>

   <p>This Privacy Notice for __________ ("we," "us," or "our"), describes how and why we might access, collect, store, use, and/or share ("process") your personal information when you use our services ("Services"), including when you:</p>
   <ul>
    <li>Visit our website at receiptsplitter.org, or any website of ours that links to this Privacy Notice</li>
    <li>Download and use our mobile application (Receipt Splitter), or any other application of ours that links to this Privacy Notice</li>
    <li>Use Receipt Splitter. The most efficient and fun way to split a receipt</li>
    <li>Engage with us in other related ways, including any sales, marketing, or events</li>
   </ul>

   <p><strong>Questions or concerns?</strong> Reading this Privacy Notice will help you understand your privacy rights and choices. We are responsible for making decisions about how your personal information is processed. If you do not agree with our policies and practices, please do not use our Services. If you still have any questions or concerns, please contact us at officialreceiptsplitter@gmail.com.</p>

   <h2>SUMMARY OF KEY POINTS</h2>
   <p>This summary provides key points from our Privacy Notice, but you can find out more details about any of these topics by clicking the link following each key point or by using our table of contents below to find the section you are looking for.</p>
   <ul>
    <li><strong>What personal information do we process?</strong> When you visit, use, or navigate our Services, we may process personal information depending on how you interact with us and the Services, the choices you make, and the products and features you use. Learn more about personal information you disclose to us.</li>
    <li><strong>Do we process any sensitive personal information?</strong> Some of the information may be considered "special" or "sensitive" in certain jurisdictions, for example your racial or ethnic origins, sexual orientation, and religious beliefs. We may process sensitive personal information when necessary with your consent or as otherwise permitted by applicable law. Learn more about sensitive information we process.</li>
    <li><strong>Do we collect any information from third parties?</strong> We do not collect any information from third parties.</li>
    <li><strong>How do we process your information?</strong> We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law. We may also process your information for other purposes with your consent. We process your information only when we have a valid legal reason to do so. Learn more about how we process your information.</li>
    <li><strong>In what situations and with which types of parties do we share personal information?</strong> We may share information in specific situations and with specific categories of third parties. Learn more about when and with whom we share your personal information.</li>
    <li><strong>How do we keep your information safe?</strong> We have adequate organizational and technical processes and procedures in place to protect your personal information. However, no electronic transmission over the internet or information storage technology can be guaranteed to be 100% secure, so we cannot promise or guarantee that hackers, cybercriminals, or other unauthorized third parties will not be able to defeat our security and improperly collect, access, steal, or modify your information. Learn more about how we keep your information safe.</li>
    <li><strong>What are your rights?</strong> Depending on where you are located geographically, the applicable privacy law may mean you have certain rights regarding your personal information. Learn more about your privacy rights.</li>
    <li><strong>How do you exercise your rights?</strong> The easiest way to exercise your rights is by submitting a data subject access request, or by contacting us. We will consider and act upon any request in accordance with applicable data protection laws.</li>
    <li><strong>Want to learn more about what we do with any information we collect?</strong> Review the Privacy Notice in full.</li>
   </ul>

   <h2>TABLE OF CONTENTS</h2>
   <ol>
    <li>WHAT INFORMATION DO WE COLLECT?</li>
    <li>HOW DO WE PROCESS YOUR INFORMATION?</li>
    <li>WHAT LEGAL BASES DO WE RELY ON TO PROCESS YOUR PERSONAL INFORMATION?</li>
    <li>WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?</li>
    <li>WHAT IS OUR STANCE ON THIRD-PARTY WEBSITES?</li>
    <li>DO WE USE COOKIES AND OTHER TRACKING TECHNOLOGIES?</li>
    <li>HOW DO WE HANDLE YOUR SOCIAL LOGINS?</li>
    <li>IS YOUR INFORMATION TRANSFERRED INTERNATIONALLY?</li>
    <li>HOW LONG DO WE KEEP YOUR INFORMATION?</li>
    <li>HOW DO WE KEEP YOUR INFORMATION SAFE?</li>
    <li>DO WE COLLECT INFORMATION FROM MINORS?</li>
    <li>WHAT ARE YOUR PRIVACY RIGHTS?</li>
    <li>CONTROLS FOR DO-NOT-TRACK FEATURES</li>
    <li>DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?</li>
    <li>LIMITATION OF LIABILITY AND SERVICE AVAILABILITY</li>
    <li>DO WE MAKE UPDATES TO THIS NOTICE?</li>
    <li>HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</li>
    <li>HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?</li>
   </ol>

   <h2>1. WHAT INFORMATION DO WE COLLECT?</h2>
   <h3>Personal information you disclose to us</h3>
   <p><strong>In Short:</strong> We collect personal information that you provide to us.</p>
   <p>We collect personal information that you voluntarily provide to us when you register on the Services, express an interest in obtaining information about us or our products and Services, when you participate in activities on the Services, or otherwise when you contact us.</p>
   <p><strong>Personal Information Provided by You.</strong> The personal information that we collect depends on the context of your interactions with us and the Services, the choices you make, and the products and features you use. The personal information we collect may include the following:</p>
   <ul>
    <li>email addresses</li>
    <li>usernames</li>
    <li>passwords</li>
    <li>names</li>
   </ul>
   <p><strong>Sensitive Information.</strong> When necessary, with your consent or as otherwise permitted by applicable law, we process the following categories of sensitive information:</p>
   <ul>
    <li>financial data</li>
   </ul>
   <p><strong>Social Media Login Data.</strong> We may provide you with the option to register with us using your existing social media account details, like your Facebook, X, or other social media account. If you choose to register in this way, we will collect certain profile information about you from the social media provider, as described in the section called "HOW DO WE HANDLE YOUR SOCIAL LOGINS?" below.</p>
   <p><strong>Application Data.</strong> If you use our application(s), we also may collect the following information if you choose to provide us with access or permission:</p>
   <ul>
    <li><strong>Mobile Device Data.</strong> We automatically collect device information (such as your mobile device ID, model, and manufacturer), operating system, version information and system configuration information, device and application identification numbers, browser type and version, hardware model Internet service provider and/or mobile carrier, and Internet Protocol (IP) address (or proxy server). If you are using our application(s), we may also collect information about the phone network associated with your mobile device, your mobile device’s operating system or platform, the type of mobile device you use, your mobile device’s unique device ID, and information about the features of our application(s) you accessed.</li>
    <li><strong>Push Notifications.</strong> We may request to send you push notifications regarding your account or certain features of the application(s). If you wish to opt out from receiving these types of communications, you may turn them off in your device's settings.</li>
   </ul>
   <p>This information is primarily needed to maintain the security and operation of our application(s), for troubleshooting, and for our internal analytics and reporting purposes.</p>
   <p>All personal information that you provide to us must be true, complete, and accurate, and you must notify us of any changes to such personal information.</p>

   <h3>Information automatically collected</h3>
   <p><strong>In Short:</strong> Some information — such as your Internet Protocol (IP) address and/or browser and device characteristics — is collected automatically when you visit our Services.</p>
   <p>We automatically collect certain information when you visit, use, or navigate the Services. This information does not reveal your specific identity (like your name or contact information) but may include device and usage information, such as your IP address, browser and device characteristics, operating system, language preferences, referring URLs, device name, country, location, information about how and when you use our Services, and other technical information. This information is primarily needed to maintain the security and operation of our Services, and for our internal analytics and reporting purposes.</p>
   <p>Like many businesses, we also collect information through cookies and similar technologies.</p>
   <p>The information we collect includes:</p>
   <ul>
    <li><strong>Log and Usage Data.</strong> Log and usage data is service-related, diagnostic, usage, and performance information our servers automatically collect when you access or use our Services and which we record in log files. Depending on how you interact with us, this log data may include your IP address, device information, browser type, and settings and information about your activity in the Services (such as the date/time stamps associated with your usage, pages and files viewed, searches, and other actions you take such as which features you use), device event information (such as system activity, error reports (sometimes called "crash dumps"), and hardware settings).</li>
    <li><strong>Device Data.</strong> We collect device data such as information about your computer, phone, tablet, or other device you use to access the Services. Depending on the device used, this device data may include information such as your IP address (or proxy server), device and application identification numbers, location, browser type, hardware model, Internet service provider and/or mobile carrier, operating system, and system configuration information.</li>
    <li><strong>Location Data.</strong> We collect location data such as information about your device's location, which can be either precise or imprecise. How much information we collect depends on the type and settings of the device you use to access the Services. For example, we may use GPS and other technologies to collect geolocation data that tells us your current location (based on your IP address). You can opt out of allowing us to collect this information either by refusing access to the information or by disabling your Location setting on your device. However, if you choose to opt out, you may not be able to use certain aspects of the Services.</li>
   </ul>

   <h3>Google API</h3>
   <p>Our use of information received from Google APIs will adhere to Google API Services User Data Policy, including the Limited Use requirements.</p>

   <h2>2. HOW DO WE PROCESS YOUR INFORMATION?</h2>
   <p><strong>In Short:</strong> We process your information to provide, improve, and administer our Services, communicate with you, for security and fraud prevention, and to comply with law. We may also process your information for other purposes with your consent.</p>
   <p>We process your personal information for a variety of reasons, depending on how you interact with our Services, including:</p>
   <ul>
    <li>To facilitate account creation and authentication and otherwise manage user accounts. We may process your information so you can create and log in to your account, as well as keep your account in working order.</li>
    <li>To request feedback. We may process your information when necessary to request feedback and to contact you about your use of our Services.</li>
    <li>To deliver targeted advertising to you. We may process your information to develop and display personalized content and advertising tailored to your interests, location, and more.</li>
    <li>To protect our Services. We may process your information as part of our efforts to keep our Services safe and secure, including fraud monitoring and prevention.</li>
    <li>To identify usage trends. We may process information about how you use our Services to better understand how they are being used so we can improve them.</li>
    <li>To save or protect an individual's vital interest. We may process your information when necessary to save or protect an individual’s vital interest, such as to prevent harm.</li>
   </ul>

   <h2>3. WHAT LEGAL BASES DO WE RELY ON TO PROCESS YOUR PERSONAL INFORMATION?</h2>
   <p><strong>In Short:</strong> We only process your personal information when we believe it is necessary and we have a valid legal reason (i.e., legal basis) to do so under applicable law, like with your consent, to comply with laws, to provide you with services to enter into or fulfill our contractual obligations, to protect your rights, or to fulfill our legitimate business interests.</p>
   <p><strong>If you are located in the EU or UK, this section applies to you.</strong></p>
   <p>The General Data Protection Regulation (GDPR) and UK GDPR require us to explain the valid legal bases we rely on in order to process your personal information. As such, we may rely on the following legal bases to process your personal information:</p>
   <ul>
    <li><strong>Consent.</strong> We may process your information if you have given us permission (i.e., consent) to use your personal information for a specific purpose. You can withdraw your consent at any time. Learn more about withdrawing your consent.</li>
    <li><strong>Legitimate Interests.</strong> We may process your information when we believe it is reasonably necessary to achieve our legitimate business interests and those interests do not outweigh your interests and fundamental rights and freedoms. For example, we may process your personal information for some of the purposes described in order to:
     <ul>
      <li>Develop and display personalized and relevant advertising content for our users</li>
      <li>Analyze how our Services are used so we can improve them to engage and retain users</li>
      <li>Diagnose problems and/or prevent fraudulent activities</li>
      <li>Understand how our users use our products and services so we can improve user experience</li>
     </ul>
    </li>
    <li><strong>Legal Obligations.</strong> We may process your information where we believe it is necessary for compliance with our legal obligations, such as to cooperate with a law enforcement body or regulatory agency, exercise or defend our legal rights, or disclose your information as evidence in litigation in which we are involved.</li>
    <li><strong>Vital Interests.</strong> We may process your information where we believe it is necessary to protect your vital interests or the vital interests of a third party, such as situations involving potential threats to the safety of any person.</li>
   </ul>

   <p><strong>If you are located in Canada, this section applies to you.</strong></p>
   <p>We may process your information if you have given us specific permission (i.e., express consent) to use your personal information for a specific purpose, or in situations where your permission can be inferred (i.e., implied consent). You can withdraw your consent at any time.</p>
   <p>In some exceptional cases, we may be legally permitted under applicable law to process your information without your consent, including, for example:</p>
   <ul>
    <li>If collection is clearly in the interests of an individual and consent cannot be obtained in a timely way</li>
    <li>For investigations and fraud detection and prevention</li>
    <li>For business transactions provided certain conditions are met</li>
    <li>If it is contained in a witness statement and the collection is necessary to assess, process, or settle an insurance claim</li>
    <li>For identifying injured, ill, or deceased persons and communicating with next of kin</li>
    <li>If we have reasonable grounds to believe an individual has been, is, or may be victim of financial abuse</li>
    <li>If it is reasonable to expect collection and use with consent would compromise the availability or the accuracy of the information and the collection is reasonable for purposes related to investigating a breach of an agreement or a contravention of the laws of Canada or a province</li>
    <li>If disclosure is required to comply with a subpoena, warrant, court order, or rules of the court relating to the production of records</li>
    <li>If it was produced by an individual in the course of their employment, business, or profession and the collection is consistent with the purposes</li>
    <li>If the collection is solely for journalistic, artistic, or literary purposes</li>
    <li>If the information is publicly available and is specified by the regulations</li>
    </ul>
      <h2>4. WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?</h2>
      <p><strong>In Short:</strong> We may share information in specific situations described in this section and/or with the following categories of third parties.</p>
      <p><strong>Vendors, Consultants, and Other Third-Party Service Providers.</strong> We may share your data with third-party vendors, service providers, contractors, or agents ("third parties") who perform services for us or on our behalf and require access to such information to do that work. We have contracts in place with these third parties, which are designed to help protect your personal information. This means that they cannot do anything with your personal information unless we have instructed them to do it. They will also not share your personal information with any organization apart from us. They also commit to protect the data they hold on our behalf and to retain it for the period we instruct.</p>
      <p>The categories of third parties we may share personal information with are as follows:</p>
      <ul>
        <li>Ad Networks</li>
        <li>Data Analytics Services</li>
        <li>Cloud Computing Services</li>
        <li>Communication & Collaboration Tools</li>
        <li>User Account Registration & Authentication Services</li>
        <li>Data Storage Service Providers</li>
        <li>Performance Monitoring Tools</li>
      </ul>
      <p>We also may need to share your personal information in the following situations:</p>
      <p><strong>Business Transfers.</strong> We may share or transfer your information in connection with, or during negotiations of, any merger, sale of company assets, financing, or acquisition of all or a portion of our business to another company.</p>

      <h2>5. WHAT IS OUR STANCE ON THIRD-PARTY WEBSITES?</h2>
      <p><strong>In Short:</strong> We are not responsible for the safety of any information that you share with third parties that we may link to or who advertise on our Services, but are not affiliated with, our Services.</p>
      <p>The Services may link to third-party websites, online services, or mobile applications and/or contain advertisements from third parties that are not affiliated with us and which may link to other websites, services, or applications. Accordingly, we do not make any guarantee regarding any such third parties, and we will not be liable for any loss or damage caused by the use of such third-party websites, services, or applications. The inclusion of a link towards a third-party website, service, or application does not imply an endorsement by us. We cannot guarantee the safety and privacy of data you provide to any third-party websites. Any data collected by third parties is not covered by this Privacy Notice. We are not responsible for the content or privacy and security practices and policies of any third parties, including other websites, services, or applications that may be linked to or from the Services. You should review the policies of such third parties and contact them directly to respond to your questions.</p>

      <h2>6. DO WE USE COOKIES AND OTHER TRACKING TECHNOLOGIES?</h2>
      <p><strong>In Short:</strong> We may use cookies and other tracking technologies to collect and store your information.</p>
      <p>We may use cookies and similar tracking technologies (like web beacons and pixels) to gather information when you interact with our Services. Some online tracking technologies help us maintain the security of our Services and your account, prevent crashes, fix bugs, save your preferences, and assist with basic site functions.</p>
      <p>We also permit third parties and service providers to use online tracking technologies on our Services for analytics and advertising, including to help manage and display advertisements, to tailor advertisements to your interests, or to send abandoned shopping cart reminders (depending on your communication preferences). The third parties and service providers use their technology to provide advertising about products and services tailored to your interests which may appear either on our Services or on other websites.</p>
      <p>To the extent these online tracking technologies are deemed to be a "sale"/"sharing" (which includes targeted advertising, as defined under the applicable laws) under applicable US state laws, you can opt out of these online tracking technologies by submitting a request as described below under section "DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?"</p>
      <p>Specific information about how we use such technologies and how you can refuse certain cookies is set out in our Cookie Notice.</p>
      <p><strong>Google Analytics</strong><br>
      We may share your information with Google Analytics to track and analyze the use of the Services. To opt out of being tracked by Google Analytics across the Services, visit 
      <a href="https://tools.google.com/dlpage/gaoptout" target="_blank" rel="noopener noreferrer">https://tools.google.com/dlpage/gaoptout</a>. For more information on the privacy practices of Google, please visit the Google Privacy & Terms page.</p>

      <h2>7. HOW DO WE HANDLE YOUR SOCIAL LOGINS?</h2>
      <p><strong>In Short:</strong> If you choose to register or log in to our Services using a social media account, we may have access to certain information about you.</p>
      <p>Our Services offer you the ability to register and log in using your third-party social media account details (like your Facebook or X logins). Where you choose to do this, we will receive certain profile information about you from your social media provider. The profile information we receive may vary depending on the social media provider concerned, but will often include your name, email address, friends list, and profile picture, as well as other information you choose to make public on such a social media platform.</p>
      <p>We will use the information we receive only for the purposes that are described in this Privacy Notice or that are otherwise made clear to you on the relevant Services. Please note that we do not control, and are not responsible for, other uses of your personal information by your third-party social media provider. We recommend that you review their privacy notice to understand how they collect, use, and share your personal information, and how you can set your privacy preferences on their sites and apps.</p>

      <h2>8. IS YOUR INFORMATION TRANSFERRED INTERNATIONALLY?</h2>
      <p><strong>In Short:</strong> We may transfer, store, and process your information in countries other than your own.</p>
      <p>Our servers are located in the United States. If you are accessing our Services from outside the United States, please be aware that your information may be transferred to, stored by, and processed by us in our facilities and in the facilities of the third parties with whom we may share your personal information (see "WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?" above), in the United States, and other countries.</p>
      <p>If you are a resident in the European Economic Area (EEA), United Kingdom (UK), or Switzerland, then these countries may not necessarily have data protection laws or other similar laws as comprehensive as those in your country. However, we will take all necessary measures to protect your personal information in accordance with this Privacy Notice and applicable law.</p>
      <p><strong>European Commission's Standard Contractual Clauses:</strong></p>
      <p>We have implemented measures to protect your personal information, including by using the European Commission's Standard Contractual Clauses for transfers of personal information between our group companies and between us and our third-party providers. These clauses require all recipients to protect all personal information that they process originating from the EEA or UK in accordance with European data protection laws and regulations. Our Standard Contractual Clauses can be provided upon request. We have implemented similar appropriate safeguards with our third-party service providers and partners and further details can be provided upon request.</p>

      <h2>9. HOW LONG DO WE KEEP YOUR INFORMATION?</h2>
      <p><strong>In Short:</strong> We keep your information for as long as necessary to fulfill the purposes outlined in this Privacy Notice unless otherwise required by law.</p>
      <p>We will only keep your personal information for as long as it is necessary for the purposes set out in this Privacy Notice, unless a longer retention period is required or permitted by law (such as tax, accounting, or other legal requirements). No purpose in this notice will require us keeping your personal information for longer than the period of time in which users have an account with us.</p>
      <p>When we have no ongoing legitimate business need to process your personal information, we will either delete or anonymize such information, or, if this is not possible (for example, because your personal information has been stored in backup archives), then we will securely store your personal information and isolate it from any further processing until deletion is possible.</p>

      <h2>10. HOW DO WE KEEP YOUR INFORMATION SAFE?</h2>
      <p><strong>In Short:</strong> We aim to protect your personal information through a system of organizational and technical security measures.</p>
      <p>We have implemented appropriate and reasonable technical and organizational security measures designed to protect the security of any personal information we process. However, despite our measures and efforts to secure your information, no electronic transmission over the Internet or information storage technology can be guaranteed to be 100% secure, so we cannot promise or guarantee that hackers, cybercriminals, or other unauthorized third parties will not be able to defeat our security and improperly collect, access, steal, or modify your information. Although we will do our best to protect your personal information, transmission of personal information to and from our Services is at your own risk. You should only access the Services within a secure environment.</p>

      <h2>11. DO WE COLLECT INFORMATION FROM MINORS?</h2>
      <p><strong>In Short:</strong> We do not knowingly collect data from or market to children under 18 years of age.</p>
      <p>We do not knowingly collect, solicit data from, or market to children under 18 years of age, nor do we knowingly sell such personal information. By using the Services, you represent that you are at least 18 or that you are the parent or guardian of such a minor and consent to such minor dependent’s use of the Services. If we learn that personal information from users less than 18 years of age has been collected, we will deactivate the account and take reasonable measures to promptly delete such data from our records. If you become aware of any data we may have collected from children under age 18, please contact us at officialreceiptsplitter@gmail.com.</p>

      <h2>12. WHAT ARE YOUR PRIVACY RIGHTS?</h2>
      <p><strong>In Short:</strong> Depending on your state of residence in the US or in some regions, such as the European Economic Area (EEA), United Kingdom (UK), Switzerland, and Canada, you have rights that allow you greater access to and control over your personal information. You may review, change, or terminate your account at any time, depending on your country, province, or state of residence.</p>
      <p>In some regions (like the EEA, UK, Switzerland, and Canada), you have certain rights under applicable data protection laws. These may include the right (i) to request access and obtain a copy of your personal information, (ii) to request rectification or erasure; (iii) to restrict the processing of your personal information; (iv) if applicable, to data portability; and (v) not to be subject to automated decision-making. In certain circumstances, you may also have the right to object to the processing of your personal information. You can make such a request by contacting us by using the contact details provided in the section "HOW CAN YOU CONTACT US ABOUT THIS NOTICE?" below.</p>
      <p>We will consider and act upon any request in accordance with applicable data protection laws.</p>
      <p>If you are located in the EEA or UK and you believe we are unlawfully processing your personal information, you also have the right to complain to your Member State data protection authority or UK data protection authority.</p>
      <p>If you are located in Switzerland, you may contact the Federal Data Protection and Information Commissioner.</p>
      <p><strong>Withdrawing your consent:</strong> If we are relying on your consent to process your personal information, which may be express and/or implied consent depending on the applicable law, you have the right to withdraw your consent at any time. You can withdraw your consent at any time by contacting us by using the contact details provided in the section "HOW CAN YOU CONTACT US ABOUT THIS NOTICE?" below.</p>
      <p>However, please note that this will not affect the lawfulness of the processing before its withdrawal nor, when applicable law allows, will it affect the processing of your personal information conducted in reliance on lawful processing grounds other than consent.</p>
      <p><strong>Account Information</strong><br>
      If you would at any time like to review or change the information in your account or terminate your account, you can:
      <ul>
        <li>Contact us using the contact information provided: officialreceiptsplitter@gmail.com</li>
      </ul>
      Upon your request to terminate your account, we will deactivate or delete your account and information from our active databases. However, we may retain some information in our files to prevent fraud, troubleshoot problems, assist with any investigations, enforce our legal terms and/or comply with applicable legal requirements.</p>
      <p><strong>Cookies and similar technologies:</strong> Most web browsers are set to accept cookies by default. If you prefer, you can usually choose to set your browser to remove cookies and to reject cookies. If you choose to remove cookies or reject cookies, this could affect certain features or services of our Services. You may also opt out of interest-based advertising by advertisers on our Services.</p>
      <p>If you have questions or comments about your privacy rights, you may email us at officialreceiptsplitter@gmail.com.</p>
        <h2>13. CONTROLS FOR DO-NOT-TRACK FEATURES</h2>
  <p>Most web browsers and some mobile operating systems and mobile applications include a Do-Not-Track ("DNT") feature or setting you can activate to signal your privacy preference not to have data about your online browsing activities monitored and collected. At this stage, no uniform technology standard for recognizing and implementing DNT signals has been finalized. As such, we do not currently respond to DNT browser signals or any other mechanism that automatically communicates your choice not to be tracked online. If a standard for online tracking is adopted that we must follow in the future, we will inform you about that practice in a revised version of this Privacy Notice.</p>
  <p>California law requires us to let you know how we respond to web browser DNT signals. Because there currently is not an industry or legal standard for recognizing or honoring DNT signals, we do not respond to them at this time.</p>

  <h2>14. DO UNITED STATES RESIDENTS HAVE SPECIFIC PRIVACY RIGHTS?</h2>
  <p><strong>In Short:</strong> If you are a resident of California, Colorado, Connecticut, Delaware, Florida, Indiana, Iowa, Kentucky, Minnesota, Montana, Nebraska, New Hampshire, New Jersey, Oregon, Tennessee, Texas, Utah, or Virginia, you may have the right to request access to and receive details about the personal information we maintain about you and how we have processed it, correct inaccuracies, get a copy of, or delete your personal information. You may also have the right to withdraw your consent to our processing of your personal information. These rights may be limited in some circumstances by applicable law. More information is provided below.</p>

  <p><strong>Categories of Personal Information We Collect</strong></p>
  <p>We have collected the following categories of personal information in the past twelve (12) months:</p>
  <table border="1" cellpadding="4" cellspacing="0">
    <thead>
      <tr>
        <th>Category</th>
        <th>Examples</th>
        <th>Collected</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>A. Identifiers</td>
        <td>Contact details, such as real name, alias, postal address, telephone or mobile contact number, unique personal identifier, online identifier, Internet Protocol address, email address, and account name</td>
        <td>NO</td>
      </tr>
      <tr>
        <td>B. Personal information as defined in the California Customer Records statute</td>
        <td>Name, contact information, education, employment, employment history, and financial information</td>
        <td>YES</td>
      </tr>
      <tr>
        <td>C. Protected classification characteristics under state or federal law</td>
        <td>Gender, age, date of birth, race and ethnicity, national origin, marital status, and other demographic data</td>
        <td>NO</td>
      </tr>
      <tr>
        <td>D. Commercial information</td>
        <td>Transaction information, purchase history, financial details, and payment information</td>
        <td>NO</td>
      </tr>
      <tr>
        <td>E. Biometric information</td>
        <td>Fingerprints and voiceprints</td>
        <td>NO</td>
      </tr>
      <tr>
        <td>F. Internet or other similar network activity</td>
        <td>Browsing history, search history, online behavior, interest data, and interactions with our and other websites, applications, systems, and advertisements</td>
        <td>NO</td>
      </tr>
      <tr>
        <td>G. Geolocation data</td>
        <td>Device location</td>
        <td>NO</td>
      </tr>
      <tr>
        <td>H. Audio, electronic, sensory, or similar information</td>
        <td>Images and audio, video or call recordings created in connection with our business activities</td>
        <td>NO</td>
      </tr>
      <tr>
        <td>I. Professional or employment-related information</td>
        <td>Business contact details in order to provide you our Services at a business level or job title, work history, and professional qualifications if you apply for a job with us</td>
        <td>NO</td>
      </tr>
      <tr>
        <td>J. Education Information</td>
        <td>Student records and directory information</td>
        <td>NO</td>
      </tr>
      <tr>
        <td>K. Inferences drawn from collected personal information</td>
        <td>Inferences drawn from any of the collected personal information listed above to create a profile or summary about, for example, an individual’s preferences and characteristics</td>
        <td>NO</td>
      </tr>
      <tr>
        <td>L. Sensitive personal Information</td>
        <td>Account login information</td>
        <td>YES</td>
      </tr>
    </tbody>
  </table>

  <p>We only collect sensitive personal information, as defined by applicable privacy laws or the purposes allowed by law or with your consent. Sensitive personal information may be used, or disclosed to a service provider or contractor, for additional, specified purposes. You may have the right to limit the use or disclosure of your sensitive personal information. We do not collect or process sensitive personal information for the purpose of inferring characteristics about you.</p>
  <p>We may also collect other personal information outside of these categories through instances where you interact with us in person, online, or by phone or mail in the context of:</p>
  <ul>
    <li>Receiving help through our customer support channels;</li>
    <li>Participation in customer surveys or contests; and</li>
    <li>Facilitation in the delivery of our Services and to respond to your inquiries.</li>
  </ul>
  <p>We will use and retain the collected personal information as needed to provide the Services or for:</p>
  <ul>
    <li>Category B  As long as the user has an account with us</li>
    <li>Category L  As long as the user has an account with us</li>
  </ul>
  <p><strong>Sources of Personal Information</strong><br>
  Learn more about the sources of personal information we collect in "WHAT INFORMATION DO WE COLLECT?"</p>
  <p><strong>How We Use and Share Personal Information</strong><br>
  Learn more about how we use your personal information in the section, "HOW DO WE PROCESS YOUR INFORMATION?"</p>
  <p>We collect and share your personal information through:</p>
  <ul>
    <li>Targeting cookies/Marketing cookies</li>
    <li>Beacons/Pixels/Tags</li>
  </ul>
  <p><strong>Will your information be shared with anyone else?</strong></p>
  <p>We may disclose your personal information with our service providers pursuant to a written contract between us and each service provider. Learn more about how we disclose personal information in the section, "WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?"</p>
  <p>We may use your personal information for our own business purposes, such as for undertaking internal research for technological development and demonstration. This is not considered to be "selling" of your personal information.</p>
  <p>We have not sold or shared any personal information to third parties for a business or commercial purpose in the preceding twelve (12) months. We have disclosed the following categories of personal information to third parties for a business or commercial purpose in the preceding twelve (12) months:</p>
  <!-- Note: This section is intentionally empty as per the user's provided text -->
  <p>The categories of third parties to whom we disclosed personal information for a business or commercial purpose can be found under "WHEN AND WITH WHOM DO WE SHARE YOUR PERSONAL INFORMATION?"</p>

  <p><strong>Your Rights</strong></p>
  <p>You have rights under certain US state data protection laws. However, these rights are not absolute, and in certain cases, we may decline your request as permitted by law. These rights include:</p>
  <ul>
    <li>Right to know whether or not we are processing your personal data</li>
    <li>Right to access your personal data</li>
    <li>Right to correct inaccuracies in your personal data</li>
    <li>Right to request the deletion of your personal data</li>
    <li>Right to obtain a copy of the personal data you previously shared with us</li>
    <li>Right to non-discrimination for exercising your rights</li>
    <li>Right to opt out of the processing of your personal data if it is used for targeted advertising (or sharing as defined under California’s privacy law), the sale of personal data, or profiling in furtherance of decisions that produce legal or similarly significant effects ("profiling")</li>
  </ul>
  <p>Depending upon the state where you live, you may also have the following rights:</p>
  <ul>
    <li>Right to access the categories of personal data being processed (as permitted by applicable law, including Minnesota’s privacy law)</li>
    <li>Right to obtain a list of the categories of third parties to which we have disclosed personal data (as permitted by applicable law, including California's and Delaware's privacy law)</li>
    <li>Right to obtain a list of specific third parties to which we have disclosed personal data (as permitted by applicable law, including Minnesota's and Oregon's privacy law)</li>
    <li>Right to review, understand, question, and correct how personal data has been profiled (as permitted by applicable law, including Minnesota’s privacy law)</li>
    <li>Right to limit use and disclosure of sensitive personal data (as permitted by applicable law, including California’s privacy law)</li>
    <li>Right to opt out of the collection of sensitive data and personal data collected through the operation of a voice or facial recognition feature (as permitted by applicable law, including Florida’s privacy law)</li>
  </ul>
  <p><strong>How to Exercise Your Rights</strong><br>
  To exercise these rights, you can contact us by submitting a data subject access request, by emailing us at officialreceiptsplitter@gmail.com, or by referring to the contact details at the bottom of this document.</p>
  <p>Under certain US state data protection laws, you can designate an authorized agent to make a request on your behalf. We may deny a request from an authorized agent that does not submit proof that they have been validly authorized to act on your behalf in accordance with applicable laws.</p>
  <p><strong>Request Verification</strong><br>
  Upon receiving your request, we will need to verify your identity to determine you are the same person about whom we have the information in our system. We will only use personal information provided in your request to verify your identity or authority to make the request. However, if we cannot verify your identity from the information already maintained by us, we may request that you provide additional information for the purposes of verifying your identity and for security or fraud-prevention purposes.</p>
  <p>If you submit the request through an authorized agent, we may need to collect additional information to verify your identity before processing your request and the agent will need to provide a written and signed permission from you to submit such request on your behalf.</p>
  <p><strong>Appeals</strong><br>
  Under certain US state data protection laws, if we decline to take action regarding your request, you may appeal our decision by emailing us at officialreceiptsplitter@gmail.com. We will inform you in writing of any action taken or not taken in response to the appeal, including a written explanation of the reasons for the decisions. If your appeal is denied, you may submit a complaint to your state attorney general.</p>
  <p><strong>California "Shine The Light" Law</strong><br>
  California Civil Code Section 1798.83, also known as the "Shine The Light" law, permits our users who are California residents to request and obtain from us, once a year and free of charge, information about categories of personal information (if any) we disclosed to third parties for direct marketing purposes and the names and addresses of all third parties with which we shared personal information in the immediately preceding calendar year. If you are a California resident and would like to make such a request, please submit your request in writing to us by using the contact details provided in the section "HOW CAN YOU CONTACT US ABOUT THIS NOTICE?"</p>

  <h2>15. LIMITATION OF LIABILITY AND SERVICE AVAILABILITY</h2>
  <p>While we make every effort to maintain the availability and functionality of ReceiptSplitter, we do not guarantee uninterrupted access to all features or services. Users acknowledge that requests for account updates, data modifications, or support may experience delays, and we are not liable for any inconvenience, data loss, or other issues resulting from such delays or service disruptions. By using the app, users agree that ReceiptSplitter and its developers are not responsible for any damages, direct or indirect, arising from the use or inability to use the app.</p>

  <h2>16. DO WE MAKE UPDATES TO THIS NOTICE?</h2>
  <p><strong>In Short:</strong> Yes, we will update this notice as necessary to stay compliant with relevant laws.</p>
  <p>We may update this Privacy Notice from time to time. The updated version will be indicated by an updated "Revised" date at the top of this Privacy Notice. If we make material changes to this Privacy Notice, we may notify you either by prominently posting a notice of such changes or by directly sending you a notification. We encourage you to review this Privacy Notice frequently to be informed of how we are protecting your information.</p>

  <h2>17. HOW CAN YOU CONTACT US ABOUT THIS NOTICE?</h2>
  <p>If you have questions or comments about this notice, you may email us at officialreceiptsplitter@gmail.com</p>

  <h2>18. HOW CAN YOU REVIEW, UPDATE, OR DELETE THE DATA WE COLLECT FROM YOU?</h2>
  <p>Based on the applicable laws of your country or state of residence in the US, you may have the right to request access to the personal information we collect from you, details about how we have processed it, correct inaccuracies, or delete your personal information. You may also have the right to withdraw your consent to our processing of your personal information. These rights may be limited in some circumstances by applicable law. To request to review, update, or delete your personal information, please fill out and submit a data subject access request.</p>
  </body>
  </html>
`;

interface PrivacyPolicyProps {
  isVisible: boolean;
  onClose: () => void;
}

const PrivacyPolicy: React.FC<PrivacyPolicyProps> = ({
  isVisible,
  onClose,
}) => {
  return (
    <Modal
      visible={isVisible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modalContainer}>
              <WebView
                originWhitelist={["*"]}
                source={{ html: htmlContent }}
                style={styles.webview}
                scrollEnabled
                nestedScrollEnabled
              />
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

export default PrivacyPolicy;

// write comments in lowercase
const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    width: "90%",
    height: "80%",
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "white",
  },
  webview: {
    flex: 1,
    width: "100%",
  },
});
