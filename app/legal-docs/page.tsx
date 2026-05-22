'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { motion } from 'motion/react';
import { useSearchParams } from 'next/navigation';
import { ShieldCheck, FileText, RefreshCcw, Loader2, ChevronLeft, ExternalLink, Mail, Globe, Award } from 'lucide-react';

const sections = [
  { slug: 'privacy', label: 'Privacy Policy', labelHi: 'गोपनीयता नीति', icon: ShieldCheck },
  { slug: 'terms', label: 'Terms of Service', labelHi: 'सेवा की शर्तें', icon: FileText },
  { slug: 'refund', label: 'Refund Policy', labelHi: 'रिफंड पॉलिसी', icon: RefreshCcw },
];

const legalContent: Record<string, { title: string; titleHi: string; sections: { heading: string; headingHi: string; body: string; bodyHi: string }[] }> = {
  privacy: {
    title: 'Privacy Policy',
    titleHi: 'गोपनीयता नीति',
    sections: [
      {
        heading: 'Introduction',
        headingHi: 'परिचय',
        body: `Yagya Ashram ("we", "us", "our") respects your privacy and is committed to protecting your personal data. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our website, courses, and services.`,
        bodyHi: `यज्ञ आश्रम ("हम", "हमें", "हमारा") आपकी गोपनीयता का सम्मान करता है और आपके व्यक्तिगत डेटा की सुरक्षा के लिए प्रतिबद्ध है। यह गोपनीयता नीति बताती है कि जब आप हमारी वेबसाइट, पाठ्यक्रमों और सेवाओं का उपयोग करते हैं तो हम आपकी जानकारी कैसे एकत्र, उपयोग, प्रकट और संरक्षित करते हैं।`,
      },
      {
        heading: 'Information We Collect',
        headingHi: 'हम क्या जानकारी एकत्र करते हैं',
        body: `We may collect the following types of information:

• Personal Identification Information: Name, email address, phone number, date of birth, and mailing address.
• Payment Information: Transaction details, payment method, and billing information (processed securely by Razorpay).
• Educational Data: Course enrollment history, lesson progress, quiz scores, and certificates earned.
• Technical Data: IP address, browser type, device information, and usage patterns.
• Communications: Messages sent through our platform, support inquiries, and feedback.`,
        bodyHi: `हम निम्नलिखित प्रकार की जानकारी एकत्र कर सकते हैं:

• व्यक्तिगत पहचान संबंधी जानकारी: नाम, ईमेल पता, फ़ोन नंबर, जन्म तिथि और डाक पता।
• भुगतान संबंधी जानकारी: लेन-देन का विवरण, भुगतान विधि और बिलिंग जानकारी (Razorpay द्वारा सुरक्षित रूप से संसाधित)।
• शैक्षिक डेटा: पाठ्यक्रम नामांकन इतिहास, पाठ प्रगति, क्विज़ स्कोर और प्राप्त प्रमाणपत्र।
• तकनीकी डेटा: IP पता, ब्राउज़र प्रकार, डिवाइस जानकारी और उपयोग पैटर्न।
• संचार: हमारे प्लेटफ़ॉर्म के माध्यम से भेजे गए संदेश, सहायता पूछताछ और प्रतिक्रिया।`,
      },
      {
        heading: 'How We Use Your Information',
        headingHi: 'हम आपकी जानकारी का उपयोग कैसे करते हैं',
        body: `We use the collected information for the following purposes:

• To provide and maintain our educational services and courses.
• To process enrollments and payments.
• To track your learning progress and issue certificates.
• To communicate with you regarding course updates, announcements, and support.
• To improve our platform, content, and user experience.
• To comply with legal obligations and prevent fraud.
• With your consent, to send promotional materials about new courses and offerings.`,
        bodyHi: `हम एकत्रित जानकारी का उपयोग निम्नलिखित उद्देश्यों के लिए करते हैं:

• हमारी शैक्षिक सेवाओं और पाठ्यक्रमों को प्रदान करना और बनाए रखना।
• नामांकन और भुगतान को संसाधित करना।
• आपकी सीखने की प्रगति को ट्रैक करना और प्रमाणपत्र जारी करना।
• पाठ्यक्रम अपडेट, घोषणाओं और सहायता के संबंध में आपसे संवाद करना।
• हमारे प्लेटफ़ॉर्म, सामग्री और उपयोगकर्ता अनुभव में सुधार करना।
• कानूनी दायित्वों का पालन करना और धोखाधड़ी को रोकना।
• आपकी सहमति से, नए पाठ्यक्रमों के बारे में प्रचार सामग्री भेजना।`,
      },
      {
        heading: 'Data Sharing and Disclosure',
        headingHi: 'डेटा साझाकरण और प्रकटीकरण',
        body: `We do not sell your personal data. We may share your information only in the following circumstances:

• Service Providers: With trusted third-party services (Razorpay for payments, Cloudflare for hosting) that help us operate our platform under strict confidentiality agreements.
• Legal Compliance: When required by law, court order, or governmental regulation.
• Business Transfers: In the event of a merger, acquisition, or sale of assets, your data may be transferred as part of the transaction.
• With Your Consent: When you have explicitly given us permission to share your information.`,
        bodyHi: `हम आपके व्यक्तिगत डेटा को नहीं बेचते हैं। हम आपकी जानकारी केवल निम्नलिखित परिस्थितियों में साझा कर सकते हैं:

• सेवा प्रदाता: विश्वसनीय तृतीय-पक्ष सेवाओं (भुगतान के लिए Razorpay, होस्टिंग के लिए Cloudflare) के साथ जो सख्त गोपनीयता समझौतों के तहत हमारे प्लेटफ़ॉर्म को संचालित करने में मदद करते हैं।
• कानूनी अनुपालन: जब कानून, अदालत के आदेश या सरकारी नियमन द्वारा आवश्यक हो।
• व्यावसायिक हस्तांतरण: विलय, अधिग्रहण या संपत्ति की बिक्री की स्थिति में, आपका डेटा लेन-देन के भाग के रूप में स्थानांतरित किया जा सकता है।
• आपकी सहमति से: जब आपने स्पष्ट रूप से हमें अपनी जानकारी साझा करने की अनुमति दी हो।`,
      },
      {
        heading: 'Data Security',
        headingHi: 'डेटा सुरक्षा',
        body: `We implement appropriate technical and organizational security measures to protect your personal data, including:

• Encryption: All data transmitted between your browser and our servers is encrypted using TLS/SSL.
• Storage: Data is stored on secure servers with restricted access.
• Payment Security: All payment processing is handled by Razorpay, which is PCI-DSS compliant.
• Access Controls: Only authorized personnel have access to personal data, and they are bound by confidentiality obligations.`,
        bodyHi: `हम आपके व्यक्तिगत डेटा की सुरक्षा के लिए उपयुक्त तकनीकी और संगठनात्मक सुरक्षा उपायों को लागू करते हैं, जिनमें शामिल हैं:

• एन्क्रिप्शन: आपके ब्राउज़र और हमारे सर्वर के बीच प्रेषित सभी डेटा TLS/SSL का उपयोग करके एन्क्रिप्ट किया जाता है।
• भंडारण: डेटा सीमित पहुंच वाले सुरक्षित सर्वरों पर संग्रहीत किया जाता है।
• भुगतान सुरक्षा: सभी भुगतान प्रसंस्करण Razorpay द्वारा संभाला जाता है, जो PCI-DSS अनुपालन है।
• पहुंच नियंत्रण: केवल अधिकृत कर्मियों की व्यक्तिगत डेटा तक पहुंच होती है, और वे गोपनीयता दायित्वों से बंधे होते हैं।`,
      },
      {
        heading: 'Your Rights',
        headingHi: 'आपके अधिकार',
        body: `Depending on your jurisdiction, you may have the following rights regarding your personal data:

• Right to Access: Request a copy of the personal data we hold about you.
• Right to Rectification: Request correction of inaccurate or incomplete data.
• Right to Erasure: Request deletion of your personal data, subject to legal retention requirements.
• Right to Restrict Processing: Request limitation of how we use your data.
• Right to Data Portability: Request transfer of your data to another service provider.
• Right to Object: Object to the processing of your data for certain purposes.

To exercise these rights, please contact us at the email address below.`,
        bodyHi: `आपके अधिकार क्षेत्र के आधार पर, आपको अपने व्यक्तिगत डेटा के संबंध में निम्नलिखित अधिकार प्राप्त हो सकते हैं:

• पहुंच का अधिकार: हमारे पास आपके बारे में मौजूद व्यक्तिगत डेटा की प्रति का अनुरोध करें।
• सुधार का अधिकार: गलत या अपूर्ण डेटा में सुधार का अनुरोध करें।
• मिटाने का अधिकार: कानूनी प्रतिधारण आवश्यकताओं के अधीन, अपने व्यक्तिगत डेटा को हटाने का अनुरोध करें।
• प्रसंस्करण प्रतिबंध का अधिकार: हम आपके डेटा का उपयोग कैसे करते हैं, इसकी सीमा का अनुरोध करें।
• डेटा पोर्टेबिलिटी का अधिकार: अपने डेटा को किसी अन्य सेवा प्रदाता को स्थानांतरित करने का अनुरोध करें।
• आपत्ति का अधिकार: कुछ उद्देश्यों के लिए आपके डेटा के प्रसंस्करण पर आपत्ति करें।

इन अधिकारों का प्रयोग करने के लिए, कृपया नीचे दिए गए ईमेल पते पर हमसे संपर्क करें।`,
      },
      {
        heading: 'Contact Us',
        headingHi: 'हमसे संपर्क करें',
        body: `If you have any questions about this Privacy Policy or wish to exercise your data rights, please contact us:

Email: legal@yagyaashram.com
Address: Yagya Ashram, [Full Address]

We will respond to your request within 30 days.`,
        bodyHi: `यदि आपके पास इस गोपनीयता नीति के बारे में कोई प्रश्न हैं या अपने डेटा अधिकारों का प्रयोग करना चाहते हैं, तो कृपया हमसे संपर्क करें:

ईमेल: legal@yagyaashram.com
पता: यज्ञ आश्रम, [पूरा पता]

हम 30 दिनों के भीतर आपके अनुरोध का जवाब देंगे।`,
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    titleHi: 'सेवा की शर्तें',
    sections: [
      {
        heading: 'Acceptance of Terms',
        headingHi: 'शर्तों की स्वीकृति',
        body: `By accessing or using the Yagya Ashram website, mobile application, and services (collectively, the "Platform"), you agree to be bound by these Terms of Service. If you do not agree with any part of these terms, you must not use the Platform.`,
        bodyHi: `यज्ञ आश्रम की वेबसाइट, मोबाइल एप्लिकेशन और सेवाओं (सामूहिक रूप से, "प्लेटफ़ॉर्म") तक पहुंच या उपयोग करके, आप सेवा की इन शर्तों से बंधने के लिए सहमत होते हैं। यदि आप इन शर्तों के किसी भी भाग से सहमत नहीं हैं, तो आपको प्लेटफ़ॉर्म का उपयोग नहीं करना चाहिए।`,
      },
      {
        heading: 'Account Registration',
        headingHi: 'खाता पंजीकरण',
        body: `To access certain features, you must create an account. You agree to:

• Provide accurate, current, and complete registration information.
• Maintain the confidentiality of your password and account.
• Notify us immediately of any unauthorized use of your account.
• Be responsible for all activities that occur under your account.
• Not create multiple accounts for abusive purposes.

You must be at least 18 years old to create an account. If you are under 18, you may use the Platform only with the involvement of a parent or guardian.`,
        bodyHi: `कुछ सुविधाओं तक पहुंचने के लिए, आपको एक खाता बनाना होगा। आप सहमत हैं कि:

• सटीक, वर्तमान और पूर्ण पंजीकरण जानकारी प्रदान करें।
• अपने पासवर्ड और खाते की गोपनीयता बनाए रखें।
• आपके खाते के किसी भी अनधिकृत उपयोग की तुरंत हमें सूचना दें।
• आपके खाते के तहत होने वाली सभी गतिविधियों के लिए जिम्मेदार रहें।
• दुरुपयोग उद्देश्यों के लिए कई खाते न बनाएं।

खाता बनाने के लिए आपकी आयु कम से कम 18 वर्ष होनी चाहिए। यदि आप 18 वर्ष से कम हैं, तो आप केवल माता-पिता या अभिभावक की भागीदारी से प्लेटफ़ॉर्म का उपयोग कर सकते हैं।`,
      },
      {
        heading: 'Course Enrollment and Payments',
        headingHi: 'पाठ्यक्रम नामांकन और भुगतान',
        body: `• Enrollment in a course grants you a non-exclusive, non-transferable license to access the course materials for your personal educational use.
• All payments are processed securely through Razorpay. We do not store your full payment card details.
• Course fees are clearly displayed at the time of enrollment. Prices may vary based on the course, batch, or promotional offers.
• We reserve the right to modify course pricing at any time, but such changes will not affect already-purchased enrollments.
• Access to course materials may be time-limited based on the specific course or batch you enroll in.`,
        bodyHi: `• किसी पाठ्यक्रम में नामांकन आपको आपके व्यक्तिगत शैक्षिक उपयोग के लिए पाठ्यक्रम सामग्री तक पहुंचने के लिए एक गैर-अनन्य, गैर-हस्तांतरणीय लाइसेंस प्रदान करता है।
• सभी भुगतान Razorpay के माध्यम से सुरक्षित रूप से संसाधित किए जाते हैं। हम आपके पूर्ण भुगतान कार्ड विवरण संग्रहीत नहीं करते हैं।
• पाठ्यक्रम शुल्क नामांकन के समय स्पष्ट रूप से प्रदर्शित किए जाते हैं। पाठ्यक्रम, बैच या प्रचार प्रस्तावों के आधार पर मूल्य भिन्न हो सकते हैं।
• हम किसी भी समय पाठ्यक्रम मूल्य निर्धारण को संशोधित करने का अधिकार सुरक्षित रखते हैं, लेकिन ऐसे परिवर्तन पहले से खरीदे गए नामांकनों को प्रभावित नहीं करेंगे।
• पाठ्यक्रम सामग्री तक पहुंच आपके द्वारा नामांकित विशिष्ट पाठ्यक्रम या बैच के आधार पर समय-सीमित हो सकती है।`,
      },
      {
        heading: 'Intellectual Property',
        headingHi: 'बौद्धिक संपदा',
        body: `All content on the Platform, including but not limited to course materials, videos, text, graphics, logos, and software, is the property of Yagya Ashram or its licensors and is protected by copyright and other intellectual property laws.

You may not:
• Reproduce, distribute, or create derivative works from our content without explicit written permission.
• Use our content for any commercial purpose without authorization.
• Remove any copyright or proprietary notices from our content.
• Share your account access or downloaded materials with others.

All trademarks, service marks, and trade names displayed on the Platform are the property of their respective owners.`,
        bodyHi: `प्लेटफ़ॉर्म पर सभी सामग्री, जिसमें पाठ्यक्रम सामग्री, वीडियो, टेक्स्ट, ग्राफिक्स, लोगो और सॉफ़्टवेयर शामिल हैं, लेकिन इन्हीं तक सीमित नहीं, यज्ञ आश्रम या इसके लाइसेंसकर्ताओं की संपत्ति है और कॉपीराइट और अन्य बौद्धिक संपदा कानूनों द्वारा संरक्षित है।

आप नहीं कर सकते:
• स्पष्ट लिखित अनुमति के बिना हमारी सामग्री को पुन: प्रस्तुत, वितरित या व्युत्पन्न कार्य नहीं बना सकते।
• प्राधिकरण के बिना किसी भी व्यावसायिक उद्देश्य के लिए हमारी सामग्री का उपयोग नहीं कर सकते।
• हमारी सामग्री से किसी भी कॉपीराइट या स्वामित्व नोटिस को नहीं हटा सकते।
• अपने खाते की पहुंच या डाउनलोड की गई सामग्री को दूसरों के साथ साझा नहीं कर सकते।

प्लेटफ़ॉर्म पर प्रदर्शित सभी ट्रेडमार्क, सेवा चिह्न और व्यापार नाम उनके संबंधित स्वामियों की संपत्ति हैं।`,
      },
      {
        heading: 'User Conduct',
        headingHi: 'उपयोगकर्ता आचरण',
        body: `You agree not to use the Platform for any unlawful purpose or in violation of these terms. Prohibited conduct includes:

• Harassing, threatening, or abusing other users or instructors.
• Posting or sharing inappropriate, defamatory, or obscene content.
• Attempting to disrupt or compromise the Platform's security.
• Using automated tools (bots, scrapers) without our consent.
• Impersonating any person or entity.
• Violating any applicable laws or regulations.

We reserve the right to suspend or terminate accounts that violate these conduct standards without prior notice.`,
        bodyHi: `आप किसी भी अवैध उद्देश्य के लिए या इन शर्तों के उल्लंघन में प्लेटफ़ॉर्म का उपयोग नहीं करने के लिए सहमत हैं। निषिद्ध आचरण में शामिल हैं:

• अन्य उपयोगकर्ताओं या प्रशिक्षकों को परेशान करना, धमकी देना या दुर्व्यवहार करना।
• अनुचित, मानहानिकारक या अश्लील सामग्री पोस्ट या साझा करना।
• प्लेटफ़ॉर्म की सुरक्षा को बाधित या समझौता करने का प्रयास करना।
• हमारी सहमति के बिना स्वचालित उपकरणों (बॉट, स्क्रैपर्स) का उपयोग करना।
• किसी भी व्यक्ति या संस्था का प्रतिरूपण करना।
• किसी भी लागू कानून या नियम का उल्लंघन करना।

हम बिना पूर्व सूचना के इन आचरण मानकों का उल्लंघन करने वाले खातों को निलंबित या समाप्त करने का अधिकार सुरक्षित रखते हैं।`,
      },
      {
        heading: 'Limitation of Liability',
        headingHi: 'देयता की सीमा',
        body: `To the maximum extent permitted by law, Yagya Ashram and its affiliates shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising out of or relating to your use of the Platform.

The Platform and its content are provided on an "as is" and "as available" basis without any warranties, either express or implied. We do not guarantee that the Platform will be uninterrupted, error-free, or secure.

Our total liability for any claims under these terms shall not exceed the total amount paid by you for the specific course or service giving rise to the claim.`,
        bodyHi: `कानून द्वारा अनुमत अधिकतम सीमा तक, यज्ञ आश्रम और इसके सहयोगी प्लेटफ़ॉर्म के आपके उपयोग से उत्पन्न या संबंधित किसी भी अप्रत्यक्ष, आकस्मिक, विशेष, परिणामी या दंडात्मक क्षतियों के लिए उत्तरदायी नहीं होंगे।

प्लेटफ़ॉर्म और इसकी सामग्री किसी भी स्पष्ट या निहित वारंटी के बिना "जैसा है" और "जैसा उपलब्ध है" के आधार पर प्रदान की जाती है। हम गारंटी नहीं देते कि प्लेटफ़ॉर्म निर्बाध, त्रुटि-मुक्त या सुरक्षित होगा।

इन शर्तों के तहत किसी भी दावे के लिए हमारी कुल देयता दावे को जन्म देने वाले विशिष्ट पाठ्यक्रम या सेवा के लिए आपके द्वारा भुगतान की गई कुल राशि से अधिक नहीं होगी।`,
      },
      {
        heading: 'Modifications to Terms',
        headingHi: 'शर्तों में संशोधन',
        body: `We reserve the right to modify these Terms of Service at any time. Changes will be effective immediately upon posting on the Platform. Your continued use of the Platform after any modifications indicates your acceptance of the updated terms.

We will make reasonable efforts to notify you of significant changes through the Platform or via email.`,
        bodyHi: `हम किसी भी समय सेवा की इन शर्तों को संशोधित करने का अधिकार सुरक्षित रखते हैं। परिवर्तन प्लेटफ़ॉर्म पर पोस्ट करने पर तुरंत प्रभावी होंगे। किसी भी संशोधन के बाद प्लेटफ़ॉर्म का आपका निरंतर उपयोग अद्यतन शर्तों की आपकी स्वीकृति को दर्शाता है।

हम प्लेटफ़ॉर्म के माध्यम से या ईमेल के माध्यम से महत्वपूर्ण परिवर्तनों के बारे में आपको सूचित करने के लिए उचित प्रयास करेंगे।`,
      },
    ],
  },
  refund: {
    title: 'Refund Policy',
    titleHi: 'रिफंड पॉलिसी',
    sections: [
      {
        heading: 'Our Commitment',
        headingHi: 'हमारी प्रतिबद्धता',
        body: `At Yagya Ashram, we want you to be satisfied with your spiritual and educational journey. This Refund Policy outlines the terms and conditions under which refunds may be issued for course enrollments and other purchases.`,
        bodyHi: `यज्ञ आश्रम में, हम चाहते हैं कि आप अपनी आध्यात्मिक और शैक्षिक यात्रा से संतुष्ट हों। यह रिफंड नीति उन शर्तों को रेखांकित करती है जिनके तहत पाठ्यक्रम नामांकन और अन्य खरीदारियों के लिए रिफंड जारी किए जा सकते हैं।`,
      },
      {
        heading: 'Eligibility Period',
        headingHi: 'पात्रता अवधि',
        body: `• You may request a full refund within 14 days of your course purchase date, provided you have completed less than 25% of the course content.
• Refund requests must be submitted in writing via email to our support team.
• The 14-day period starts from the date of purchase confirmation.`,
        bodyHi: `• आप अपने पाठ्यक्रम खरीद की तारीख से 14 दिनों के भीतर पूर्ण रिफंड का अनुरोध कर सकते हैं, बशर्ते आपने 25% से कम पाठ्यक्रम सामग्री पूरी की हो।
• रिफंड अनुरोध हमारी सहायता टीम को ईमेल के माध्यम से लिखित रूप में प्रस्तुत किया जाना चाहिए।
• 14-दिन की अवधि खरीद पुष्टिकरण की तारीख से शुरू होती है।`,
      },
      {
        heading: 'Non-Refundable Situations',
        headingHi: 'गैर-रिफंडेबल स्थितियां',
        body: `Refunds will not be issued in the following cases:

• If you have completed 25% or more of the course content.
• If more than 14 days have passed since the purchase date.
• For live session recordings or downloadable content that has been accessed.
• For self-study credit packs that have been partially or fully used.
• For individual (1-on-1) class bookings that have been scheduled and attended.
• In cases where the refund request is due to a change of mind after significant course access.`,
        bodyHi: `निम्नलिखित मामलों में रिफंड जारी नहीं किए जाएंगे:

• यदि आपने 25% या अधिक पाठ्यक्रम सामग्री पूरी कर ली है।
• यदि खरीद की तारीख से 14 दिन से अधिक हो गए हैं।
• लाइव सत्र रिकॉर्डिंग या डाउनलोड करने योग्य सामग्री जो एक्सेस की गई है, के लिए।
• स्व-अध्ययन क्रेडिट पैक के लिए जो आंशिक या पूर्ण रूप से उपयोग किए गए हैं।
• व्यक्तिगत (1-ऑन-1) कक्षा बुकिंग के लिए जो शेड्यूल की गई हैं और भाग लिया गया है।
• ऐसे मामलों में जहां महत्वपूर्ण पाठ्यक्रम पहुंच के बाद मन बदलने के कारण रिफंड अनुरोध किया गया है।`,
      },
      {
        heading: 'Refund Process',
        headingHi: 'रिफंड प्रक्रिया',
        body: `Once your refund request is approved:

• The refund will be processed to your original payment method within 7-10 business days.
• You will receive a confirmation email once the refund has been initiated.
• Depending on your bank or payment provider, it may take additional time for the refund to appear in your account.

To request a refund, please email us with your registered email address, course name, and reason for the refund request.`,
        bodyHi: `आपके रिफंड अनुरोध के स्वीकृत होने के बाद:

• रिफंड आपके मूल भुगतान विधि में 7-10 कार्य दिवसों के भीतर संसाधित किया जाएगा।
• रिफंड शुरू होने के बाद आपको एक पुष्टिकरण ईमेल प्राप्त होगा।
• आपके बैंक या भुगतान प्रदाता के आधार पर, रिफंड को आपके खाते में दिखाई देने में अतिरिक्त समय लग सकता है।

रिफंड का अनुरोध करने के लिए, कृपया हमें अपने पंजीकृत ईमेल पते, पाठ्यक्रम नाम और रिफंड अनुरोध के कारण के साथ ईमेल करें।`,
      },
      {
        heading: 'Exceptional Circumstances',
        headingHi: 'असाधारण परिस्थितियां',
        body: `We understand that exceptional circumstances may arise. If you are facing:

• Medical emergencies affecting your ability to study.
• Technical issues preventing access to course content that we are unable to resolve.
• Duplicate or incorrect charges.

Please contact us, and we will review your case individually. We strive to be fair and reasonable in all situations.`,
        bodyHi: `हम समझते हैं कि असाधारण परिस्थितियां उत्पन्न हो सकती हैं। यदि आप सामना कर रहे हैं:

• चिकित्सा आपात स्थिति जो आपकी पढ़ने की क्षमता को प्रभावित कर रही हो।
• तकनीकी समस्याएं जो पाठ्यक्रम सामग्री तक पहुंच को रोक रही हों और जिन्हें हम हल करने में असमर्थ हैं।
• डुप्लिकेट या गलत शुल्क।

कृपया हमसे संपर्क करें, और हम आपके मामले की व्यक्तिगत रूप से समीक्षा करेंगे। हम सभी स्थितियों में निष्पक्ष और उचित होने का प्रयास करते हैं।`,
      },
    ],
  },
};

function LegalContent() {
  const searchParams = useSearchParams();
  const slug = searchParams.get('slug') || 'terms';
  const data = legalContent[slug] || legalContent.terms;
  const activeIdx = sections.findIndex((s) => s.slug === slug);

  return (
    <div className="min-h-screen bg-black text-white selection:bg-orange-500/30">
      {/* Top Navigation */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-neutral-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2 text-neutral-400 hover:text-white transition-colors">
              <ChevronLeft className="w-4 h-4" />
              <span className="text-sm font-medium">Home</span>
            </Link>
            <nav className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
              {sections.map((s, i) => (
                <Link
                  key={s.slug}
                  href={`/legal-docs?slug=${s.slug}`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs sm:text-sm font-bold whitespace-nowrap transition-all ${
                    slug === s.slug
                      ? 'bg-orange-500/15 text-orange-400 border border-orange-500/30'
                      : 'text-neutral-500 hover:text-neutral-300 hover:bg-neutral-900 border border-transparent'
                  }`}
                >
                  <s.icon className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">{s.label}</span>
                  <span className="sm:hidden">{s.labelHi}</span>
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </div>

      <div className="max-6xl mx-auto pt-24 pb-32 px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          {/* Header */}
          <div className="max-w-4xl mx-auto mb-16">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 bg-orange-500/10 rounded-2xl border border-orange-500/20">
                {sections[activeIdx] && (() => {
                  const Icon = sections[activeIdx].icon;
                  return <Icon className="w-8 h-8 text-orange-400" />;
                })()}
              </div>
              <div>
                <h1 className="text-3xl sm:text-5xl font-black tracking-tight">{data.title}</h1>
                <p className="text-neutral-500 text-sm sm:text-base font-bold mt-1">{data.titleHi}</p>
              </div>
            </div>
            <div className="h-1 w-24 bg-gradient-to-r from-orange-500 to-orange-400 rounded-full" />
          </div>

          {/* Content Sections */}
          <div className="max-w-4xl mx-auto space-y-12">
            {data.sections.map((section, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: idx * 0.1 }}
                className="group"
              >
                <div className="flex items-center gap-3 mb-4">
                  <span className="flex-shrink-0 w-8 h-8 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400 text-xs font-black">
                    {idx + 1}
                  </span>
                  <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">{section.heading}</h2>
                </div>
                <p className="text-neutral-200/90 text-base sm:text-lg leading-relaxed mb-3">{section.headingHi}</p>
                <div className="ml-11 pl-1 border-l-2 border-neutral-800 group-hover:border-orange-500/30 transition-colors">
                  <div className="text-neutral-400 text-sm sm:text-base leading-relaxed whitespace-pre-line font-medium">
                    {section.body}
                  </div>
                  <div className="mt-4 text-neutral-500 text-sm leading-relaxed whitespace-pre-line border-t border-neutral-800/50 pt-4">
                    {section.bodyHi}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Footer */}
          <div className="max-w-4xl mx-auto mt-20 pt-10 border-t border-neutral-900">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 text-sm">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-neutral-400">
                  <Mail className="w-4 h-4" />
                  <span className="font-bold text-neutral-300">Email</span>
                </div>
                <p className="text-neutral-500">legal@yagyaashram.com</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-neutral-400">
                  <Globe className="w-4 h-4" />
                  <span className="font-bold text-neutral-300">Website</span>
                </div>
                <p className="text-neutral-500">www.yagyaashram.com</p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-neutral-400">
                  <Award className="w-4 h-4" />
                  <span className="font-bold text-neutral-300">Last Updated</span>
                </div>
                <p className="text-neutral-500 font-mono text-xs uppercase tracking-widest">17 April 2026</p>
              </div>
            </div>
            <div className="mt-8 pt-8 border-t border-neutral-900/50 text-center">
              <p className="text-neutral-700 text-xs font-mono uppercase tracking-widest">
                &copy; {new Date().getFullYear()} Yagya Ashram. All rights reserved.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function LegalPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-orange-500 mx-auto" />
          <p className="text-neutral-500 text-sm font-bold uppercase tracking-widest">Loading...</p>
        </div>
      </div>
    }>
      <LegalContent />
    </Suspense>
  );
}
