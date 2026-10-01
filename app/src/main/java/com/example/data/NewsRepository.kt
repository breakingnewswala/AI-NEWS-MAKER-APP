package com.example.data

import com.example.model.*
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import android.content.Context
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject

object NewsRepository {

    private val repositoryScope = CoroutineScope(Dispatchers.IO + SupervisorJob())
    private const val THREE_DAYS_MS = 3L * 24 * 60 * 60 * 1000L

    // Managed saved channels (25+ top news channels + custom added)
    private val _savedChannels = MutableStateFlow<List<String>>(
        listOf(
            "आज तक (Aaj Tak)",
            "दैनिक भास्कर (Dainik Bhaskar)",
            "NDTV इंडिया",
            "ABP न्यूज़",
            "ज़ी न्यूज़ (Zee News)",
            "नवभारत टाइम्स (NBT)",
            "अमर उजाला (Amar Ujala)",
            "बीबीसी हिंदी (BBC Hindi)",
            "न्यूज़18 इंडिया (News18)",
            "पत्रिका (Patrika)",
            "जनसत्ता (Jansatta)",
            "दैनिक जागरण (Dainik Jagran)",
            "हिंदुस्तान (Live Hindustan)",
            "इंडिया टीवी (India TV)",
            "रिपब्लिक भारत",
            "मनीकंट्रोल (Moneycontrol)",
            "पंजाब केसरी",
            "प्रभात खबर",
            "द लल्लनटॉप (The Lallantop)",
            "ईटीवी भारत",
            "दूरदर्शन न्यूज़ (DD News)",
            "न्यूज़ 24 (News 24)",
            "द क्विंट हिंदी",
            "वनइंडिया हिंदी",
            "फर्स्टपोस्ट हिंदी"
        )
    )
    val savedChannels: StateFlow<List<String>> = _savedChannels.asStateFlow()

    fun addSavedChannel(name: String) {
        val clean = name.trim()
        if (clean.isNotBlank() && !_savedChannels.value.contains(clean)) {
            _savedChannels.value = listOf(clean) + _savedChannels.value
        }
    }

    // Dynamic Categories managed by Chief Admin
    private val _categories = MutableStateFlow<List<ManagedCategory>>(
        listOf(
            ManagedCategory("all", "सभी (All)", isDeletable = false),
            ManagedCategory("breaking", "ब्रेकिंग न्यूज़", isDeletable = false),
            ManagedCategory("politics", "राजनीति"),
            ManagedCategory("tech", "टेक्नोलॉजी"),
            ManagedCategory("entertainment", "मनोरंजन"),
            ManagedCategory("sports", "खेल"),
            ManagedCategory("business", "कारोबार"),
            ManagedCategory("crime", "क्राइम / अपराध"),
            ManagedCategory("state", "राज्य / स्थानीय")
        )
    )
    val categories: StateFlow<List<ManagedCategory>> = _categories.asStateFlow()

    fun addCategory(displayName: String) {
        val clean = displayName.trim()
        if (clean.isNotBlank() && _categories.value.none { it.displayName.equals(clean, ignoreCase = true) }) {
            val newCat = ManagedCategory("cat_${System.currentTimeMillis()}", clean, true)
            _categories.value = _categories.value + newCat
        }
    }

    fun editCategory(id: String, newName: String) {
        val clean = newName.trim()
        if (clean.isNotBlank()) {
            _categories.value = _categories.value.map {
                if (it.id == id) it.copy(displayName = clean) else it
            }
        }
    }

    fun deleteCategory(id: String) {
        _categories.value = _categories.value.filterNot { it.id == id && it.isDeletable }
    }

    fun generateFullArticleContent(
        title: String,
        summary: String,
        channel: String,
        category: String
    ): String {
        return """
$summary

📌 मुख्य विवरण एवं पृष्ठभूमि:
इस घटनाक्रम को लेकर प्रशासनिक हलकों और संबंधित विशेषज्ञों के बीच विस्तृत चर्चा जारी है। विभाग के वरिष्ठ अधिकारियों ने पुष्टि की है कि इस मामले पर कई हफ्तों से गहन विचार-विमर्श चल रहा था। मामले की संवेदनशीलता को देखते हुए विस्तृत दिशा-निर्देश और एसओपी (SOP) भी जारी कर दिए गए हैं। विशेषज्ञों का मानना है कि इसका प्रभाव सीधे तौर पर आम जनता और उद्योग जगत दोनों पर दूरगामी रूप से पड़ेगा।

🎤 आधिकारिक बयान एवं प्रेस वार्ता:
$channel के विशेष संवाददाता के अनुसार, संबंधित प्रवक्ता ने प्रेस कॉन्फ्रेंस में स्पष्ट किया: "हमारा मुख्य उद्देश्य प्रणाली को आधुनिक, पारदर्शी और सर्वसुलभ बनाना है। तकनीकी और कानूनी पहलुओं की पूरी समीक्षा के बाद ही इस महत्वपूर्ण कदम को आगे बढ़ाया गया है।" इस दौरान अन्य राष्ट्रीय और अंतरराष्ट्रीय एजेंसियों के साथ भी समन्वय पर जोर दिया गया है।

📊 मुख्य बिंदु एवं प्रभाव विश्लेषण:
• इस विकास से संबंधित क्षेत्र के लाखों नागरिकों और हितधारकों को त्वरित समाधान एवं नई सुविधाएं मिलेंगी।
• 24x7 निगरानी के लिए केंद्रीय नियंत्रण कक्ष और डिजिटल डैशबोर्ड स्थापित किया गया है।
• आगामी 30 दिनों में इसके दूसरे चरण के विस्तार की रूपरेखा तैयार की जाएगी।
• कानूनी, वित्तीय और तकनीकी सलाहकारों ने इसे समय की मांग और गेम-चेंजर फैसला करार दिया है।

🔍 संपादकीय दृष्टि एवं निष्कर्ष:
यह घटनाक्रम राष्ट्रीय परिप्रेक्ष्य में बेहद अहम है। नीति आयोग और नियामक प्राधिकरणों ने भी इस दिशा में सकारात्मक संकेत दिए हैं। जमीनी स्तर पर इसके क्रियान्वयन को सुनिश्चित करने के लिए विशेष कार्यबल को जिम्मेदारी सौंपी गई है।

📡 $channel डिजिटल न्यूज़ डेस्क | विशेष लाइव बुलेटिन | नई दिल्ली
        """.trimIndent()
    }

    // Generator for 55 rich news posts within last 3 days
    private fun createInitialPosts(): List<NewsPost> {
        val now = System.currentTimeMillis()
        val list = mutableListOf<NewsPost>()

        val rawSeed = listOf(
            Triple(
                "भारत ने लॉन्च किया नया AI सुपरकंप्यूटिंग नेटवर्क, वैश्विक स्तर पर बनेगी नई पहचान",
                "विज्ञान एवं प्रौद्योगिकी मंत्रालय द्वारा आज देश के अत्याधुनिक AI सुपरकंप्यूटिंग क्लस्टर का अनावरण किया गया। यह तकनीक मौसम पूर्वानुमान और स्वास्थ्य क्षेत्र में क्रांति लाएगी। वैज्ञानिकों ने इसे आत्मनिर्भर भारत का मील का पत्थर बताया।",
                Pair("दैनिक भास्कर", "https://dainikbhaskar.com/tech/india-supercomputing-ai")
            ),
            Triple(
                "संसद में डिजिटल मीडिया और AI न्यूज़ प्रसारण पर ऐतिहासिक विधेयक पेश",
                "सूचना एवं प्रसारण मंत्रालय ने डिजिटल न्यूज़ पब्लिशर्स और एआई आधारित कंटेंट जनरेशन के लिए मानक तय करने हेतु ऐतिहासिक बिल पेश किया। इसमें डीपफेक और भ्रामक खबरों पर कड़े जुर्माने का प्रावधान रखा गया है।",
                Pair("आज तक (Aaj Tak)", "https://aajtak.in/national/story/digital-media-ai-bill-in-parliament")
            ),
            Triple(
                "एशिया कप क्रिकेट: भारत ने रोमांचक मुकाबले में पाकिस्तान को 5 विकेट से हराया",
                "भारतीय टीम ने शानदार खेल का प्रदर्शन करते हुए अंतिम ओवर में जीत दर्ज की। सलामी बल्लेबाज ने 85 रनों की नाबाद पारी खेली, वहीं गेंदबाजों ने डेथ ओवर्स में कसी हुई गेंदबाजी की।",
                Pair("NDTV इंडिया", "https://ndtv.in/sports/asia-cup-india-victory-final")
            ),
            Triple(
                "सेंसेक्स में 1100 अंकों का रिकॉर्ड उछाल, निफ्टी 25,500 के नए शिखर पर पहुंचा",
                "घरेलू शेयर बाजारों में विदेशी संस्थागत निवेशकों (FII) की वापसी से बाजार नई ऊंचाई पर पहुंचा। बैंकिंग, ऑटो और आईटी सेक्टर में भारी लिवाली देखने को मिली।",
                Pair("मनीकंट्रोल (Moneycontrol)", "https://moneycontrol.com/markets/sensex-nifty-surge-today")
            ),
            Triple(
                "इसरो ने गगनयान मिशन के दूसरे क्रू-एस्केप सिस्टम का सफल परीक्षण किया",
                "भारतीय अंतरिक्ष अनुसंधान संगठन (ISRO) ने श्रीहरिकोटा से मानव अंतरिक्ष उड़ान 'गगनयान' के लिए अत्याधुनिक सेफ्टी मॉड्यूल का सफल परीक्षण पूरा किया। वैज्ञानिकों में उत्साह का माहौल।",
                Pair("ABP न्यूज़", "https://abplive.com/science/isro-gaganyaan-crew-escape-test-success")
            ),
            Triple(
                "मौसम अलर्ट: उत्तर भारत में भारी बारिश और ओलावृष्टि की चेतावनी जारी",
                "मौसम विभाग (IMD) ने अगले 48 घंटों में दिल्ली, हरियाणा, पंजाब और पश्चिमी यूपी के कई जिलों में तेज आंधी और बारिश के लिए ऑरेंज अलर्ट जारी किया है। किसानों को सतर्क रहने की सलाह दी गई है।",
                Pair("अमर उजाला (Amar Ujala)", "https://amarujala.com/weather/heavy-rain-alert-north-india")
            ),
            Triple(
                "राष्ट्रीय राजमार्गों पर अब लागू होगा सेटेलाइट आधारित टोल कलेक्शन सिस्टम",
                "सड़क परिवहन मंत्रालय ने फास्टैग के बाद अब जीपीएस और सैटेलाइट बेस्ड टोल प्रणाली को देश के प्रमुख एक्सप्रेसवे पर पायलट प्रोजेक्ट के तौर पर शुरू करने की घोषणा की है।",
                Pair("ज़ी न्यूज़ (Zee News)", "https://zeenews.india.com/hindi/automobiles/satellite-toll-collection-system-india")
            ),
            Triple(
                "ऑस्कर 2026: भारतीय सिनेमा की दो स्वतंत्र फिल्मों को आधिकारिक नामांकन",
                "भारतीय सिनेमा ने एक बार फिर अंतरराष्ट्रीय मंच पर अपना परचम लहराया है। डॉक्यूमेंट्री और बेस्ट इंटरनेशनल फीचर श्रेणी में भारत की दावेदारी मजबूत हुई है।",
                Pair("बीबीसी हिंदी (BBC Hindi)", "https://bbc.com/hindi/entertainment-documentary-award")
            ),
            Triple(
                "राजधानी दिल्ली में वायु प्रदूषण से निपटने के लिए नया 15-सूत्रीय विंटर एक्शन प्लान लागू",
                "पर्यावरण मंत्री ने इलेक्ट्रिक बसों की संख्या बढ़ाने, एंटी-स्मॉग गन तैनात करने और निर्माण कार्यों पर कड़े नियमों की निगरानी के लिए विशेष टास्क फोर्स गठित की है।",
                Pair("नवभारत टाइम्स (NBT)", "https://navbharattimes.indiatimes.com/metro/delhi/winter-action-plan-pollution")
            ),
            Triple(
                "सोने की कीमतों में भारी गिरावट, चांदी 2000 रुपये प्रति किलो सस्ती हुई",
                "वैश्विक बाजारों में डॉलर की मजबूती के चलते सर्राफा बाजार में सोने और चांदी की कीमतों में नरमी देखने को मिली। आभूषण खरीदारों के चेहरों पर खुशी लौटी।",
                Pair("दैनिक जागरण (Dainik Jagran)", "https://jagran.com/business/gold-silver-rate-fall-today")
            ),
            Triple(
                "साइबर पुलिस की बड़ी कार्रवाई: 500 करोड़ के ऑनलाइन गेमिंग और बेटिंग सिंडिकेट का भंडाफोड़",
                "विशेष सेल ने फर्जी ऐप बनाकर आम लोगों से करोड़ों रुपये ठगने वाले अंतरराज्यीय गिरोह के 8 शातिर साइबर अपराधियों को गिरफ्तार किया। कई लैपटॉप और बैंक खाते सीज।",
                Pair("पत्रिका (Patrika)", "https://patrika.com/crime/cyber-fraud-interstate-gang-busted")
            ),
            Triple(
                "रेलवे का बड़ा ऐलान: 50 नए रूटों पर दौड़ेंगी स्लीपर वंदे भारत ट्रेनें",
                "रेल मंत्रालय ने लंबी दूरी के यात्रियों की सुविधा के लिए आधुनिक सुविधाओं से लैस स्लीपर वंदे भारत एक्सप्रेस ट्रेनों के उत्पादन को तेज करने का निर्देश दिया है।",
                Pair("हिंदुस्तान (Live Hindustan)", "https://livehindustan.com/national/vande-bharat-sleeper-trains-new-routes")
            ),
            Triple(
                "स्मार्टफोन बाजार में भारत ने दर्ज की 15% की ग्रोथ, एक्सपोर्ट में तोड़े सारे रिकॉर्ड",
                "इलेक्ट्रॉनिक्स एवं आईटी मंत्रालय की रिपोर्ट के अनुसार, भारत से मोबाइल फोन का वैश्विक निर्यात 1.2 लाख करोड़ रुपये के पार पहुंच गया है।",
                Pair("द लल्लनटॉप (The Lallantop)", "https://thelallantop.com/technology/india-smartphone-exports-record-high")
            ),
            Triple(
                "अंतरराष्ट्रीय योग दिवस: लाल किले से कर्तव्य पथ तक विशेष तैयारी, 1 लाख से अधिक लोग जुड़ेंगे",
                "केंद्रीय आयुष मंत्रालय ने इस वर्ष के योग महोत्सव की भव्य तैयारियों का ब्योरा साझा किया। दुनिया के 180 से अधिक देशों में भारतीय दूतावासों में कार्यक्रम होंगे।",
                Pair("दूरदर्शन न्यूज़ (DD News)", "https://ddnews.gov.in/national/international-yoga-day-preparations")
            ),
            Triple(
                "ओलंपिक क्वालीफायर: भारतीय महिला हॉकी टीम ने सेमीफाइनल में दर्ज की शानदार जीत",
                "भारतीय महिला टीम ने आक्रामक रणनीति अपनाते हुए विपक्षी टीम को 3-1 से हराकर आगामी ओलंपिक खेलों के लिए अपनी दावेदारी बेहद मजबूत कर ली है।",
                Pair("जनसत्ता (Jansatta)", "https://jansatta.com/sports/indian-womens-hockey-team-olympic-qualifier-win")
            ),
            Triple(
                "इलेक्ट्रिक वाहनों (EV) पर नई सब्सिडी नीति को कैबिनेट की मंजूरी, चार्जिंग स्टेशन बढ़ेंगे",
                "सरकार ने स्वच्छ ऊर्जा और प्रदूषण मुक्त परिवहन को बढ़ावा देने के लिए नई फेम योजना के तहत दोपहिया और चार पहिया ईवी पर आकर्षक प्रोत्साहन पैकेज को मंजूरी दी।",
                Pair("इंडिया टीवी (India TV)", "https://indiatv.in/business/cabinet-approves-new-ev-subsidy-policy")
            ),
            Triple(
                "सुप्रीम कोर्ट का ऐतिहासिक फैसला: नागरिकों के डिजिटल निजता के अधिकार पर अहम दिशा-निर्देश",
                "शीर्ष अदालत की पांच जजों की संविधान पीठ ने बिना कानूनी प्रक्रिया के व्यक्तिगत डेटा एक्सेस करने पर रोक लगाने के सख्त आदेश जारी किए।",
                Pair("न्यूज़18 इंडिया (News18)", "https://hindi.news18.com/news/nation/supreme-court-verdict-digital-privacy-rights")
            ),
            Triple(
                "बॉलीवुड स्टार्स की नई मल्टी-स्टारर थ्रिलर का ट्रेलर रिलीज, 24 घंटे में मिले 40 मिलियन व्यूज",
                "निर्माताओं ने साल की सबसे बड़ी एक्शन ड्रामा फिल्म का पहला टीज़र जारी किया। वीएफएक्स और डायलॉग्स को सोशल मीडिया पर जबरदस्त प्रतिक्रिया मिल रही है।",
                Pair("ईटीवी भारत", "https://etvbharat.com/hindi/entertainment/new-bollywood-action-thriller-trailer-release")
            ),
            Triple(
                "किसानों के लिए खुशखबरी: पीएम किसान सम्मान निधि की अगली किस्त इस तारीख को होगी जारी",
                "कृषि मंत्रालय ने बताया कि देश के 9 करोड़ से अधिक लाभार्थी किसानों के बैंक खातों में डीबीटी के माध्यम से सीधे दो-दो हजार रुपये की राशि ट्रांसफर की जाएगी।",
                Pair("पंजाब केसरी", "https://punjabkesari.in/national/pm-kisan-samman-nidhi-next-installment-date")
            ),
            Triple(
                "भारत-फ्रांस रक्षा समझौता: 26 नए राफेल-एम नौसेना लड़ाकू विमानों की डिलीवरी प्रक्रिया तेज",
                "रक्षा मंत्रालय ने आईएनएस विक्रांत और आईएनएस विक्रमादित्य के लिए अत्याधुनिक नौसैनिक राफेल जेट्स के अधिग्रहण की अंतिम औपचारिकताओं को पूरा किया।",
                Pair("रिपब्लिक भारत", "https://republicbharat.com/defence/india-france-rafale-m-fighter-jets-deal")
            )
        )

        val categoriesPool = listOf(
            NewsCategory.BREAKING,
            NewsCategory.POLITICS,
            NewsCategory.TECH,
            NewsCategory.SPORTS,
            NewsCategory.BUSINESS,
            NewsCategory.ENTERTAINMENT,
            NewsCategory.CRIME,
            NewsCategory.STATE
        )

        val imageUrls = listOf(
            "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1541872703-74c5e44368f9?w=800&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1531415074968-036ba1b575da?w=800&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=800&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=800&auto=format&fit=crop",
            "https://images.unsplash.com/photo-1526470608268-f674ce90ebd4?w=800&auto=format&fit=crop"
        )

        val timeLabels = listOf(
            "5 मिनट पहले",
            "12 मिनट पहले",
            "25 मिनट पहले",
            "40 मिनट पहले",
            "1 घंटा पहले",
            "2 घंटे पहले",
            "3 घंटे पहले",
            "5 घंटे पहले",
            "8 घंटे पहले",
            "12 घंटे पहले",
            "1 दिन पहले",
            "1.5 दिन पहले",
            "2 दिन पहले"
        )

        // Generate 55 items by cycling and formatting seeds
        for (i in 0 until 55) {
            val seed = rawSeed[i % rawSeed.size]
            val cat = categoriesPool[i % categoriesPool.size]
            val img = imageUrls[i % imageUrls.size]
            val timeOffsetMs = (i * 75L * 60 * 1000L).coerceAtMost(THREE_DAYS_MS - (2 * 3600 * 1000L))
            val postTimestamp = now - timeOffsetMs
            val timeLabel = timeLabels[(i * 3) % timeLabels.size]
            val isRss = (i % 3 != 0) // Mix of RSS and Web links
            val isBreaking = (i == 0 || i == 1 || i == 6 || i == 14)
            val isExclusive = (i == 0) // Post 0 is highlighted exclusive

            val titleModifier = if (i >= rawSeed.size) " • अपडेट [खंड ${(i / rawSeed.size) + 1}]" else ""

            list.add(
                NewsPost(
                    id = "post-$i",
                    title = seed.first + titleModifier,
                    summary = seed.second,
                    sourceChannel = seed.third.first,
                    sourceUrl = seed.third.second,
                    category = cat,
                    categoryName = cat.displayName,
                    publishedTime = timeLabel,
                    imageUrl = img,
                    isRssFeed = isRss,
                    breaking = isBreaking,
                    timestamp = postTimestamp,
                    fullContent = generateFullArticleContent(seed.first, seed.second, seed.third.first, cat.displayName),
                    isExclusive = isExclusive
                )
            )
        }

        return list
    }

    private val _posts = MutableStateFlow<List<NewsPost>>(createInitialPosts())
    val posts: StateFlow<List<NewsPost>> = _posts.asStateFlow()

    const val CLOUD_STORAGE_NEWS_URL = "https://firebasestorage.googleapis.com/v0/b/ainewsmakerapp.firebasestorage.app/o/news_database.json?alt=media"

    init {
        repositoryScope.launch {
            syncWithFirebaseCloud()
        }
    }

    /**
     * Synchronize news feed posts with Firebase Cloud Storage live database
     * Connects and unifies Android Mobile App and Web Studio live feed
     */
    suspend fun syncWithFirebaseCloud(context: Context? = null) = withContext(Dispatchers.IO) {
        try {
            val url = java.net.URL("$CLOUD_STORAGE_NEWS_URL&_t=${System.currentTimeMillis()}")
            val conn = url.openConnection() as java.net.HttpURLConnection
            conn.connectTimeout = 8000
            conn.readTimeout = 8000
            conn.requestMethod = "GET"
            conn.setRequestProperty("Accept", "application/json")

            if (conn.responseCode == 200) {
                val jsonString = conn.inputStream.bufferedReader().use { it.readText() }
                val jsonArray = JSONArray(jsonString)
                if (jsonArray.length() > 0) {
                    val cloudPosts = mutableListOf<NewsPost>()
                    for (i in 0 until jsonArray.length()) {
                        val obj = jsonArray.getJSONObject(i)
                        val id = obj.optString("id", "cloud-post-$i")
                        val title = obj.optString("title", "")
                        val summary = obj.optString("summary", "")
                        val sourceChannel = obj.optString("sourceChannel", "AI News Maker")
                        val sourceUrl = obj.optString("sourceUrl", "")
                        val catStr = obj.optString("category", "breaking")
                        val catName = obj.optString("categoryName", "ब्रेकिंग न्यूज़")
                        val publishedTime = obj.optString("publishedTime", "अभी-अभी")
                        val imageUrl = obj.optString("imageUrl", "")
                        val isBreaking = obj.optBoolean("breaking", false)
                        val isExclusive = obj.optBoolean("isExclusive", false)
                        val timestamp = obj.optLong("timestamp", System.currentTimeMillis())
                        val fullContent = obj.optString("fullContent", summary)

                        val catEnum = when (catStr.lowercase()) {
                            "politics" -> NewsCategory.POLITICS
                            "sports" -> NewsCategory.SPORTS
                            "business" -> NewsCategory.BUSINESS
                            "tech" -> NewsCategory.TECH
                            "entertainment" -> NewsCategory.ENTERTAINMENT
                            "state" -> NewsCategory.STATE
                            "crime" -> NewsCategory.CRIME
                            else -> NewsCategory.BREAKING
                        }

                        if (title.isNotBlank()) {
                            cloudPosts.add(
                                NewsPost(
                                    id = id,
                                    title = title,
                                    summary = summary,
                                    sourceChannel = sourceChannel,
                                    sourceUrl = sourceUrl,
                                    category = catEnum,
                                    categoryName = catName,
                                    publishedTime = publishedTime,
                                    imageUrl = imageUrl,
                                    breaking = isBreaking,
                                    timestamp = timestamp,
                                    fullContent = fullContent,
                                    isExclusive = isExclusive
                                )
                            )
                        }
                    }
                    if (cloudPosts.isNotEmpty()) {
                        _posts.value = cloudPosts
                        Log.i("NewsRepository", "Successfully synced ${cloudPosts.size} posts from Firebase Cloud Storage")
                    }
                }
            }
        } catch (e: Exception) {
            Log.w("NewsRepository", "Firebase cloud news sync error: ${e.message}")
        }
    }

    private val _userRole = MutableStateFlow(UserRole.USER)
    val userRole: StateFlow<UserRole> = _userRole.asStateFlow()

    // Live Breaking Ticker
    private val _liveTickerText = MutableStateFlow(
        "🔴 LIVE: भारत का नया AI सुपरकंप्यूटिंग नेटवर्क सक्रिय • संसद में डिजिटल मीडिया रेगुलेशन बिल पेश • एशियाई खेलों में भारतीय टीम का शानदार प्रदर्शन"
    )
    val liveTickerText: StateFlow<String> = _liveTickerText.asStateFlow()

    // Pending Graphic News for Newsroom auto-paste & Gemini generation
    private val _pendingGraphicPost = MutableStateFlow<NewsPost?>(null)
    val pendingGraphicPost: StateFlow<NewsPost?> = _pendingGraphicPost.asStateFlow()

    // Pending Video item for Video Studio editor
    private val _pendingVideoItem = MutableStateFlow<VideoNewsItem?>(null)
    val pendingVideoItem: StateFlow<VideoNewsItem?> = _pendingVideoItem.asStateFlow()

    fun setPendingVideo(video: VideoNewsItem) {
        _pendingVideoItem.value = video
    }

    fun clearPendingVideo() {
        _pendingVideoItem.value = null
    }

    fun setPendingGraphicNews(post: NewsPost) {
        _pendingGraphicPost.value = post
        prepareJacketFromPost(post)
    }

    fun clearPendingGraphicNews() {
        _pendingGraphicPost.value = null
    }

    fun clearPendingNews() {
        _pendingGraphicPost.value = null
    }

    fun resetAllUserData() {
        _pendingGraphicPost.value = null
        _pendingVideoItem.value = null
        _userRole.value = UserRole.USER
        _savedChannels.value = listOf(
            "आज तक (Aaj Tak)",
            "दैनिक भास्कर (Dainik Bhaskar)",
            "NDTV इंडिया",
            "ABP न्यूज़",
            "ज़ी न्यूज़ (Zee News)",
            "नवभारत टाइम्स (NBT)",
            "अमर उजाला (Amar Ujala)",
            "बीबीसी हिंदी (BBC Hindi)",
            "न्यूज़18 इंडिया (News18)",
            "पत्रिका (Patrika)",
            "जनसत्ता (Jansatta)",
            "दैनिक जागरण (Dainik Jagran)",
            "हिंदुस्तान (Live Hindustan)",
            "इंडिया टीवी (India TV)",
            "रिपब्लिक भारत",
            "मनीकंट्रोल (Moneycontrol)",
            "पंजाब केसरी",
            "प्रभात खबर",
            "द लल्लनटॉप (The Lallantop)",
            "ईटीवी भारत",
            "दूरदर्शन न्यूज़ (DD News)",
            "न्यूज़ 24 (News 24)",
            "द क्विंट हिंदी",
            "वनइंडिया हिंदी",
            "फर्स्टपोस्ट हिंदी"
        )
        _categories.value = listOf(
            ManagedCategory("all", "सभी (All)", isDeletable = false),
            ManagedCategory("breaking", "ब्रेकिंग न्यूज़", isDeletable = false),
            ManagedCategory("politics", "राजनीति"),
            ManagedCategory("tech", "टेक्नोलॉजी"),
            ManagedCategory("entertainment", "मनोरंजन"),
            ManagedCategory("sports", "खेल"),
            ManagedCategory("business", "कारोबार"),
            ManagedCategory("crime", "क्राइम / अपराध"),
            ManagedCategory("state", "राज्य / स्थानीय")
        )
        _posts.value = createInitialPosts()
    }

    fun getPendingNewsJson(): String {
        val p = _pendingGraphicPost.value ?: return ""
        val escapedTitle = p.title.replace("\"", "\\\"").replace("\n", " ")
        val escapedSummary = p.summary.replace("\"", "\\\"").replace("\n", " ")
        val effectiveUrl = if (p.sourceUrl.isNotBlank()) p.sourceUrl else "https://breakingnewswala.com/news/${p.id}"
        val escapedUrl = effectiveUrl.replace("\"", "\\\"")
        val escapedImg = (p.imageUrl ?: "").replace("\"", "\\\"")
        val escapedCat = p.categoryName.replace("\"", "\\\"")
        return """{"url":"$escapedUrl","title":"$escapedTitle","summary":"$escapedSummary","imageUrl":"$escapedImg","category":"$escapedCat"}"""
    }

    // 3-Day Data Retention Policy Pruning
    fun pruneExpiredPosts() {
        val now = System.currentTimeMillis()
        _posts.value = _posts.value.filter { (now - it.timestamp) <= THREE_DAYS_MS }
    }

    // Master Branding Defaults for Jackets
    private val _masterChannelName = MutableStateFlow("AI NEWS 24")
    val masterChannelName: StateFlow<String> = _masterChannelName.asStateFlow()

    private val _masterLogoText = MutableStateFlow("AI NEWS MAKER")
    val masterLogoText: StateFlow<String> = _masterLogoText.asStateFlow()

    private val _masterDefaultReporter = MutableStateFlow("ब्यूरो चीफ / विशेष संवाददाता")
    val masterDefaultReporter: StateFlow<String> = _masterDefaultReporter.asStateFlow()

    private val _masterLocation = MutableStateFlow("नई दिल्ली")
    val masterLocation: StateFlow<String> = _masterLocation.asStateFlow()

    // Managed Users
    private val _users = MutableStateFlow(
        listOf(
            UserAccount("u-1", "राहुल शर्मा (Rahul)", "सीनियर रिपोर्टर", "rahul.news@example.com", 3, true),
            UserAccount("u-2", "प्रिया वर्मा (Priya)", "सब-एडिटर (डेस्क)", "priya.editor@example.com", 5, true),
            UserAccount("u-3", "अमित कुमार (Amit)", "वीडियो प्रोड्यूसर", "amit.producer@example.com", 2, true),
            UserAccount("u-4", "नेहा सिंह (Neha)", "ई-पेपर कोऑर्डिनेटर", "neha.epaper@example.com", 1, false)
        )
    )
    val users: StateFlow<List<UserAccount>> = _users.asStateFlow()

    // Managed User Projects & Commands
    private val _userProjects = MutableStateFlow(
        listOf(
            UserProject(
                id = "proj-101",
                userId = "u-1",
                userName = "राहुल शर्मा (Reporter)",
                userRoleLabel = "फील्ड रिपोर्टर",
                type = ProjectType.GRAPHIC_JACKET,
                title = "संसद लाइव: बजट सत्र पर विशेष विश्लेषण ग्राफिक",
                summary = "हेडर-फुटर जैकेट तैयार किया गया। मुख्य प्रवक्ता का बयान कोट किया गया।",
                status = ProjectStatus.IN_REVIEW,
                timestamp = "15 मिनट पहले",
                assignedJacketTheme = "रेड ब्रेकिंग",
                adminNotes = "कृपया हेडलाइन 5 शब्द छोटी करें"
            ),
            UserProject(
                id = "proj-102",
                userId = "u-3",
                userName = "अमित कुमार (Video)",
                userRoleLabel = "वीडियो एडिटर",
                type = ProjectType.VIDEO_NEWS,
                title = "इसरो प्रक्षेपण: लोअर-थर्ड जैकेट रील",
                summary = "01:30 मिनट का बुलेटिन तैयार। बैकग्राउंड म्यूजिक और टिकर सिंक किया गया।",
                status = ProjectStatus.APPROVED,
                timestamp = "35 मिनट पहले",
                assignedJacketTheme = "गोल्डन प्राइम",
                adminNotes = "परफेक्ट, पब्लिश कर सकते हैं"
            ),
            UserProject(
                id = "proj-103",
                userId = "u-2",
                userName = "प्रिया वर्मा (Desk)",
                userRoleLabel = "सब-एडिटर",
                type = ProjectType.GRAPHIC_JACKET,
                title = "बाजार बुलेटिन: सेंसेक्स रिकॉर्ड उछाल",
                summary = "मनीकंट्रोल वेब लिंक से 1-क्लिक जैकेट बनाया गया।",
                status = ProjectStatus.PUBLISHED,
                timestamp = "1 घंटा पहले",
                assignedJacketTheme = "डार्क स्टूडियो",
                isArchived = true,
                archivedAt = "आज, 06:15 PM"
            ),
            UserProject(
                id = "proj-104",
                userId = "u-4",
                userName = "नेहा सिंह (E-Paper)",
                userRoleLabel = "ई-पेपर डेस्क",
                type = ProjectType.EPAPER_EDITION,
                title = "राष्ट्रीय संस्करण - पेज 1 फ्रंट हेडलाइन लेआउट",
                summary = "राष्ट्रीय और अंतरराष्ट्रीय टॉप 4 खबरों का कंपोजिशन।",
                status = ProjectStatus.DRAFT,
                timestamp = "2 घंटे पहले",
                assignedJacketTheme = "ब्रॉडशीट प्रिंट"
            )
        )
    )
    val userProjects: StateFlow<List<UserProject>> = _userProjects.asStateFlow()

    // Admin Commands sent to users
    private val _adminCommands = MutableStateFlow(
        listOf(
            AdminCommand("cmd-1", "राहुल शर्मा", "प्रोजेक्ट #proj-101 में सब-हेडलाइन अपडेट करें और 2 मिनट में री-सबमिट करें।", "10 मिनट पहले", false),
            AdminCommand("cmd-2", "अमित कुमार", "इसरो वीडियो रील को सभी सोशल प्लेटफॉर्म्स पर पब्लिश करें।", "30 मिनट पहले", true)
        )
    )
    val adminCommands: StateFlow<List<AdminCommand>> = _adminCommands.asStateFlow()

    // Managed RSS / Web Channel Sources
    private val _rssChannels = MutableStateFlow(
        listOf(
            RssChannelSource("ch-1", "दैनिक भास्कर", "https://dainikbhaskar.com/rss/national.xml", NewsCategory.POLITICS, true, "5 मिनट पहले", 18),
            RssChannelSource("ch-2", "आज तक (Aaj Tak)", "https://aajtak.in/rss/breaking.xml", NewsCategory.BREAKING, true, "2 मिनट पहले", 24),
            RssChannelSource("ch-3", "NDTV इंडिया", "https://ndtv.in/rss/topstories.xml", NewsCategory.SPORTS, true, "12 मिनट पहले", 10),
            RssChannelSource("ch-4", "मनीकंट्रोल (Moneycontrol)", "https://moneycontrol.com/rss/market.xml", NewsCategory.BUSINESS, true, "20 मिनट पहले", 15),
            RssChannelSource("ch-5", "बीबीसी हिंदी (BBC Hindi)", "https://bbc.com/hindi/rss.xml", NewsCategory.ENTERTAINMENT, true, "30 मिनट पहले", 8)
        )
    )
    val rssChannels: StateFlow<List<RssChannelSource>> = _rssChannels.asStateFlow()

    private val _activeJacketData = MutableStateFlow(
        NewsJacketData(
            headline = "AI NEWS MAKER में आपका स्वागत है",
            subHeadline = "किसी भी न्यूज़ लिंक से तुरंत हेडर-फुटर जैकेट ग्राफ़िक तैयार करें",
            headerTitle = "AI NEWS MAKER",
            tagText = "BREAKING NEWS",
            channelName = "AI NEWS 24",
            reporterName = "एडमिन डेस्क",
            location = "नई दिल्ली",
            dateText = SimpleDateFormat("dd MMMM, yyyy", Locale("hi", "IN")).format(Date()),
            sourceLink = "https://ainewsmaker.in"
        )
    )
    val activeJacketData: StateFlow<NewsJacketData> = _activeJacketData.asStateFlow()

    fun setUserRole(role: UserRole) {
        _userRole.value = role
    }

    fun setLiveTickerText(text: String) {
        _liveTickerText.value = text
    }

    fun updateMasterBranding(channel: String, logo: String, reporter: String, location: String) {
        _masterChannelName.value = channel
        _masterLogoText.value = logo
        _masterDefaultReporter.value = reporter
        _masterLocation.value = location
    }

    fun toggleRssChannel(channelId: String) {
        _rssChannels.value = _rssChannels.value.map {
            if (it.id == channelId) it.copy(isActive = !it.isActive) else it
        }
    }

    fun addRssChannel(name: String, url: String, category: NewsCategory) {
        val newChannel = RssChannelSource(
            id = "ch-${System.currentTimeMillis()}",
            channelName = name,
            feedUrl = url,
            category = category,
            isActive = true,
            lastSyncTime = "अभी-अभी"
        )
        _rssChannels.value = listOf(newChannel) + _rssChannels.value
    }

    fun deleteRssChannel(channelId: String) {
        _rssChannels.value = _rssChannels.value.filterNot { it.id == channelId }
    }

    fun updateProjectStatus(projectId: String, newStatus: ProjectStatus, note: String = "") {
        _userProjects.value = _userProjects.value.map {
            if (it.id == projectId) {
                it.copy(
                    status = newStatus,
                    adminNotes = if (note.isNotBlank()) note else it.adminNotes
                )
            } else it
        }
    }

    fun archiveProject(projectId: String) {
        val now = java.text.SimpleDateFormat("dd MMM, hh:mm a", java.util.Locale("hi", "IN")).format(java.util.Date())
        _userProjects.value = _userProjects.value.map {
            if (it.id == projectId) {
                it.copy(isArchived = true, archivedAt = now)
            } else it
        }
    }

    fun unarchiveProject(projectId: String) {
        _userProjects.value = _userProjects.value.map {
            if (it.id == projectId) {
                it.copy(isArchived = false, archivedAt = null)
            } else it
        }
    }

    fun archiveCompletedProjects(): Int {
        val now = java.text.SimpleDateFormat("dd MMM, hh:mm a", java.util.Locale("hi", "IN")).format(java.util.Date())
        var count = 0
        _userProjects.value = _userProjects.value.map {
            if (!it.isArchived && (it.status == ProjectStatus.PUBLISHED || it.status == ProjectStatus.APPROVED)) {
                count++
                it.copy(isArchived = true, archivedAt = now)
            } else it
        }
        return count
    }

    fun deleteProjectPermanently(projectId: String) {
        _userProjects.value = _userProjects.value.filterNot { it.id == projectId }
    }

    fun sendAdminCommand(targetUserName: String, commandText: String) {
        val newCmd = AdminCommand(
            id = "cmd-${System.currentTimeMillis()}",
            targetUserName = targetUserName,
            commandText = commandText,
            issuedTime = "अभी-अभी",
            isCompleted = false
        )
        _adminCommands.value = listOf(newCmd) + _adminCommands.value
    }

    fun markCommandDone(commandId: String) {
        _adminCommands.value = _adminCommands.value.map {
            if (it.id == commandId) it.copy(isCompleted = true) else it
        }
    }

    // New Redesigned Admin Feed additions:
    fun addWebLinkPost(
        channel: String,
        url: String,
        categoryName: String,
        customTitle: String? = null,
        customSummary: String? = null
    ) {
        addSavedChannel(channel)
        val catEnum = NewsCategory.values().find { it.displayName.contains(categoryName, ignoreCase = true) }
            ?: NewsCategory.BREAKING

        val domain = try {
            java.net.URI(url).host?.replace("www.", "") ?: channel
        } catch (e: Exception) {
            channel
        }

        val headline = if (!customTitle.isNullOrBlank()) customTitle else "$channel विशेष रिपोर्ट: $domain से ताज़ा अपडेट"
        val desc = if (!customSummary.isNullOrBlank()) customSummary else "इस वेब लिंक से सीधे AI न्यूज़ ग्राफिक और सोशल मीडिया जैकेट तैयार किया जा सकता है। लिंक स्रोत: $url"

        val placeholderId = "post-${System.currentTimeMillis()}"
        val newPost = NewsPost(
            id = placeholderId,
            title = headline,
            summary = desc,
            sourceChannel = channel,
            sourceUrl = url,
            category = catEnum,
            categoryName = categoryName,
            publishedTime = "अभी-अभी (Just now)",
            isRssFeed = false,
            breaking = true,
            timestamp = System.currentTimeMillis(),
            fullContent = generateFullArticleContent(headline, desc, channel, categoryName),
            imageUrl = "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop"
        )
        _posts.value = listOf(newPost) + _posts.value
        pruneExpiredPosts()

        // Asynchronously fetch OpenGraph metadata from the live URL
        repositoryScope.launch {
            try {
                val realArticle = LiveFeedNetworkManager.fetchWebArticleMetadata(url, channel, categoryName)
                withContext(Dispatchers.Main) {
                    _posts.value = _posts.value.map { if (it.id == placeholderId) realArticle else it }
                    _liveTickerText.value = realArticle.title
                }
            } catch (e: Exception) {
                // Keep initial post on failure
            }
        }
    }

    fun addRssFeedPost(
        channel: String,
        url: String,
        categoryName: String = "ब्रेकिंग न्यूज़",
        customTitle: String? = null,
        customSummary: String? = null
    ) {
        addSavedChannel(channel)
        val catEnum = NewsCategory.values().find { it.displayName.contains(categoryName, ignoreCase = true) }
            ?: NewsCategory.BREAKING
        addRssChannel(channel, url, catEnum)
        val headline = if (!customTitle.isNullOrBlank()) customTitle else "$channel लाइव RSS बुलेटिन: ताज़ा सुर्खियां"
        val desc = if (!customSummary.isNullOrBlank()) customSummary else "RSS फीड से सीधे रियल-टाइम बुलेटिन जोड़ा गया। टच करके पूरी खबर पढ़ें या 1-क्लिक में AI ग्राफिक बनाएं।"
        val placeholderId = "post-${System.currentTimeMillis()}"
        val newPost = NewsPost(
            id = placeholderId,
            title = headline,
            summary = desc,
            sourceChannel = channel,
            sourceUrl = url,
            category = catEnum,
            categoryName = categoryName,
            publishedTime = "अभी-अभी (Just now)",
            isRssFeed = true,
            breaking = true,
            timestamp = System.currentTimeMillis(),
            fullContent = generateFullArticleContent(headline, desc, channel, categoryName),
            imageUrl = "https://images.unsplash.com/photo-1585829365295-ab7cd400c167?w=800&auto=format&fit=crop"
        )
        _posts.value = listOf(newPost) + _posts.value
        pruneExpiredPosts()

        // Asynchronously fetch real live articles from the RSS feed
        repositoryScope.launch {
            try {
                val liveItems = LiveFeedNetworkManager.fetchRssFeed(url, channel, catEnum)
                if (liveItems.isNotEmpty()) {
                    withContext(Dispatchers.Main) {
                        val filtered = _posts.value.filterNot { it.id == placeholderId }
                        _posts.value = liveItems + filtered
                        _liveTickerText.value = liveItems.first().title
                    }
                }
            } catch (e: Exception) {
                // Keep initial placeholder on failure
            }
        }
    }

    fun deletePost(postId: String) {
        _posts.value = _posts.value.filterNot { it.id == postId }
    }

    fun updatePost(
        postId: String,
        newTitle: String,
        newSummary: String,
        newChannel: String,
        newCategoryName: String,
        isBreaking: Boolean,
        isExclusive: Boolean
    ) {
        _posts.value = _posts.value.map { post ->
            if (post.id == postId) {
                post.copy(
                    title = newTitle,
                    summary = newSummary,
                    sourceChannel = newChannel,
                    categoryName = newCategoryName,
                    breaking = isBreaking,
                    isExclusive = isExclusive
                )
            } else post
        }
    }

    fun bulkDeletePosts(postIds: Set<String>) {
        _posts.value = _posts.value.filterNot { postIds.contains(it.id) }
    }

    fun bulkHighlightPosts(postIds: Set<String>, isExclusive: Boolean) {
        _posts.value = _posts.value.map { post ->
            if (postIds.contains(post.id)) {
                post.copy(isExclusive = isExclusive)
            } else post
        }
    }

    // Admin Toggle Highlight (विशेष नोटिफिकेशन बोर्ड / एक्सक्लूसिव बॉक्स)
    fun toggleHighlight(postId: String) {
        _posts.value = _posts.value.map { post ->
            if (post.id == postId) {
                post.copy(isExclusive = !post.isExclusive)
            } else {
                post
            }
        }
    }

    fun setPostHighlight(postId: String, isHighlighted: Boolean) {
        _posts.value = _posts.value.map { post ->
            if (post.id == postId) {
                post.copy(isExclusive = isHighlighted)
            } else {
                post
            }
        }
    }

    // User Profile & Custom Sign-up PNG Logo
    private val _userProfile = MutableStateFlow(
        UserProfileData(
            name = "चीफ एडिटर (Admin Desk)",
            channelName = "AI NEWS MAKER",
            email = "editor@ainewsmaker.online",
            logoUri = null,
            isVerified = true
        )
    )
    val userProfile: StateFlow<UserProfileData> = _userProfile.asStateFlow()

    fun updateUserLogo(logoUri: String?) {
        _userProfile.value = _userProfile.value.copy(logoUri = logoUri)
    }

    fun updateUserProfile(name: String, channelName: String, email: String, logoUri: String?) {
        _userProfile.value = _userProfile.value.copy(
            name = name.ifBlank { _userProfile.value.name },
            channelName = channelName.ifBlank { _userProfile.value.channelName },
            email = email.ifBlank { _userProfile.value.email },
            logoUri = logoUri ?: _userProfile.value.logoUri
        )
        if (channelName.isNotBlank()) {
            _masterChannelName.value = channelName
            _masterLogoText.value = channelName
        }
    }

    // Backward compatibility for existing call sites
    fun addPost(
        title: String,
        summary: String,
        channel: String,
        url: String,
        category: NewsCategory,
        isRss: Boolean
    ) {
        addSavedChannel(channel)
        val newPost = NewsPost(
            id = "post-${System.currentTimeMillis()}",
            title = title,
            summary = summary,
            sourceChannel = channel,
            sourceUrl = url,
            category = category,
            categoryName = category.displayName,
            publishedTime = "अभी-अभी (Just now)",
            isRssFeed = isRss,
            breaking = true,
            timestamp = System.currentTimeMillis(),
            fullContent = generateFullArticleContent(title, summary, channel, category.displayName)
        )
        _posts.value = listOf(newPost) + _posts.value
        pruneExpiredPosts()
    }

    fun prepareJacketFromPost(post: NewsPost) {
        val dateStr = SimpleDateFormat("dd MMMM, yyyy", Locale("hi", "IN")).format(Date())
        _activeJacketData.value = NewsJacketData(
            headline = post.title,
            subHeadline = post.summary,
            headerTitle = "AI NEWS MAKER",
            tagText = if (post.breaking) "BREAKING NEWS" else post.categoryName,
            channelName = post.sourceChannel,
            reporterName = "AI जनरेटेड न्यूज़",
            location = "लाइव अपडेट",
            dateText = dateStr,
            sourceLink = post.sourceUrl,
            style = JacketStyle.RED_BREAKING
        )
    }

    fun updateJacketData(data: NewsJacketData) {
        _activeJacketData.value = data
    }

    fun resetJacketData() {
        _activeJacketData.value = NewsJacketData()
    }

    // Fresh RSS Feeds Dynamic Pool for Instant Live Refreshing
    private var refreshCount = 0

    private val dynamicRefreshUpdates = listOf(
        Triple(
            "🔴 सुप्रीम कोर्ट का ऐतिहासिक फैसला: डिजिटल मीडिया व प्राइवेसी पर नई राष्ट्रीय गाइडलाइंस लागू",
            "शीर्ष अदालत की पांच जजों की संविधान पीठ ने डिजिटल समाचार, सोशल मीडिया और एआई प्लेटफॉर्म्स के लिए अनिवार्य सुरक्षा एवं पारदर्शिता मानकों को तुरंत प्रभावी करने का आदेश दिया।",
            Pair("आज तक (Aaj Tak)", "https://aajtak.in/national/supreme-court-digital-privacy-guidelines-live")
        ),
        Triple(
            "🔴 इसरो का बड़ा ऐलान: भारतीय अंतरिक्ष स्टेशन (BAS) के प्रथम मॉड्यूल का सफल परीक्षण",
            "भारतीय अंतरिक्ष अनुसंधान संगठन (ISRO) ने स्वदेशी अंतरिक्ष स्टेशन के लाइफ सपोर्ट और क्रू-डॉकिंग सिस्टम का ग्राउंड परीक्षण सफलतापूर्वक संपन्न किया।",
            Pair("दैनिक भास्कर", "https://bhaskar.com/science/isro-space-station-module-tested")
        ),
        Triple(
            "🔴 शेयर बाजार में ऐतिहासिक तेजी: सेंसेक्स पहली बार 85,500 के पार, निवेशकों को 3 लाख करोड़ का मुनाफा",
            "घरेलू एवं वैश्विक अर्थव्यवस्था में मजबूत संकेतकों के चलते बैंकिंग, ऑटो, आईटी और ऊर्जा शेयरों में रिकॉर्ड स्तर की खरीदारी देखी गई।",
            Pair("NDTV इंडिया", "https://ndtv.in/business/sensex-nifty-all-time-high-rally")
        ),
        Triple(
            "🔴 रेल मंत्रालय का मेगा प्रोजेक्ट: 50 नई वंदे भारत स्लीपर और बुलेट ट्रेन का रूट मैप फाइनल",
            "लंबी दूरी के यात्रियों के लिए अत्यधिक आधुनिक और सुरक्षा कवच 4.0 से सुसज्जित नई ट्रेनों का नियमित संचालन अगले माह से प्रारंभ होगा।",
            Pair("ज़ी न्यूज़ (Zee News)", "https://zeenews.india.com/railways/vande-bharat-sleeper-trial-update")
        ),
        Triple(
            "🔴 केंद्रीय कैबिनेट की बैठक: 1 लाख सोलर रूफटॉप और ग्रीन एनर्जी कॉरिडोर पैकेज को दी मंजूरी",
            "प्रधानमंत्री की अध्यक्षता में आयोजित कैबिनेट बैठक में पर्यावरण अनुकूल स्वच्छ ऊर्जा पर अतिरिक्त सब्सिडी और सोलर सब्सिडी को हरी झंडी दी गई।",
            Pair("अमर उजाला (Amar Ujala)", "https://amarujala.com/business/cabinet-approves-green-energy-corridor")
        ),
        Triple(
            "🔴 मौसम अलर्ट: आगामी 36 घंटों में उत्तर व मध्य भारत के 8 राज्यों में भारी बारिश व आंधी की चेतावनी",
            "मौसम विभाग (IMD) ने चक्रवाती परिसंचरण के मद्देनजर ऑरेंज अलर्ट जारी किया है। तटीय एवं पहाड़ी क्षेत्रों में विशेष सतर्कता बरतने के निर्देश दिए गए हैं।",
            Pair("News18 इंडिया", "https://news18.com/weather/monsoon-heavy-rain-alert-states")
        )
    )

    fun refreshFeed() {
        pruneExpiredPosts()
        val now = System.currentTimeMillis()

        // Fetch fresh incoming RSS updates
        val update1 = dynamicRefreshUpdates[(refreshCount * 2) % dynamicRefreshUpdates.size]
        val update2 = dynamicRefreshUpdates[(refreshCount * 2 + 1) % dynamicRefreshUpdates.size]
        refreshCount++

        val newPost1 = NewsPost(
            id = "refresh-rss-${now}-1",
            title = update1.first,
            summary = update1.second,
            sourceChannel = update1.third.first,
            sourceUrl = update1.third.second,
            category = NewsCategory.BREAKING,
            categoryName = "ब्रेकिंग न्यूज़",
            publishedTime = "अभी-अभी (ताज़ा अपडेट)",
            imageUrl = "https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=800&auto=format&fit=crop",
            isRssFeed = true,
            breaking = true,
            timestamp = now,
            fullContent = generateFullArticleContent(update1.first, update1.second, update1.third.first, "ब्रेकिंग न्यूज़"),
            isExclusive = true // Highlighted in the notification board
        )

        val newPost2 = NewsPost(
            id = "refresh-rss-${now}-2",
            title = update2.first,
            summary = update2.second,
            sourceChannel = update2.third.first,
            sourceUrl = update2.third.second,
            category = NewsCategory.TECH,
            categoryName = "टेक्नोलॉजी",
            publishedTime = "अभी-अभी (ताज़ा अपडेट)",
            imageUrl = "https://images.unsplash.com/photo-1518770660439-4636190af475?w=800&auto=format&fit=crop",
            isRssFeed = true,
            breaking = true,
            timestamp = now - 2000,
            fullContent = generateFullArticleContent(update2.first, update2.second, update2.third.first, "टेक्नोलॉजी"),
            isExclusive = false
        )

        // Prepend fresh updates to the top of the feed
        _posts.value = listOf(newPost1, newPost2) + _posts.value
        _liveTickerText.value = update1.first

        // Also query active live RSS feeds in background over internet
        repositoryScope.launch {
            try {
                val activeChannels = _rssChannels.value.filter { it.isActive }.take(3)
                for (ch in activeChannels) {
                    val fetched = LiveFeedNetworkManager.fetchRssFeed(ch.feedUrl, ch.channelName, ch.category)
                    if (fetched.isNotEmpty()) {
                        withContext(Dispatchers.Main) {
                            val currentTitles = _posts.value.map { it.title }.toSet()
                            val uniqueNew = fetched.filterNot { currentTitles.contains(it.title) }.take(3)
                            if (uniqueNew.isNotEmpty()) {
                                _posts.value = uniqueNew + _posts.value
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                // Ignore network error during background refresh
            }
        }
    }
}
