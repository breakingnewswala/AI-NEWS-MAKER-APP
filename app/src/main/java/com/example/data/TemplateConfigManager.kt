package com.example.data

import android.content.Context
import android.content.SharedPreferences
import org.json.JSONObject

data class TemplateHeaderFooter(
    val templateId: String,
    val brandName: String = "",
    val brandTagline: String = "",
    val customLogoUrl: String = "",
    val customHeaderPng: String = "",
    val whatsappNumber: String = "",
    val socialHandle: String = "",
    val newsUpdateBadge: String = "",
    val customFooterPng: String = "",
    val isConfigured: Boolean = false
)

object TemplateConfigManager {
    private const val PREF_NAME = "news_template_configs"
    private const val KEY_CONFIGS = "template_header_footer_json"
    private const val KEY_APPLY_ALL = "apply_to_all_templates"

    // Graphic 1 registered in Basic Plan
    val AVAILABLE_TEMPLATES = mutableListOf<Pair<String, String>>(
        "graphic_001" to "Graphic 1 (बेसिक 4:5 न्यूज़ जैकेट)"
    )

    fun registerTemplate(id: String, label: String) {
        AVAILABLE_TEMPLATES.removeAll { it.first == id }
        AVAILABLE_TEMPLATES.add(id to label)
    }

    fun clearAllTemplates() {
        AVAILABLE_TEMPLATES.clear()
    }

    private fun getPrefs(context: Context): SharedPreferences {
        return context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
    }

    fun isApplyToAll(context: Context): Boolean {
        return getPrefs(context).getBoolean(KEY_APPLY_ALL, true)
    }

    fun setApplyToAll(context: Context, applyToAll: Boolean) {
        getPrefs(context).edit().putBoolean(KEY_APPLY_ALL, applyToAll).apply()
    }

    fun syncWithAuthProfile(
        context: Context,
        channelName: String,
        logoUrl: String,
        whatsapp: String = "",
        website: String = ""
    ) {
        setApplyToAll(context, true)
        val config = TemplateHeaderFooter(
            templateId = "graphic_001",
            brandName = channelName,
            customLogoUrl = logoUrl,
            whatsappNumber = whatsapp,
            socialHandle = website,
            isConfigured = true
        )
        saveTemplateConfig(context, config, applyToAll = true)
    }

    fun clearAllConfigs(context: Context) {
        getPrefs(context).edit().clear().apply()
    }

    fun getConfigsJson(context: Context): String {
        return getPrefs(context).getString(KEY_CONFIGS, "{}") ?: "{}"
    }

    fun getTemplateConfig(context: Context, templateId: String): TemplateHeaderFooter {
        val applyToAll = isApplyToAll(context)
        val jsonStr = getConfigsJson(context)
        try {
            val root = JSONObject(jsonStr)
            val effectiveId = if (applyToAll && !root.has(templateId)) {
                // If applyToAll is on, find any configured template or "default"
                root.keys().asSequence().firstOrNull() ?: templateId
            } else {
                templateId
            }

            if (root.has(effectiveId)) {
                val obj = root.getJSONObject(effectiveId)
                return TemplateHeaderFooter(
                    templateId = templateId,
                    brandName = obj.optString("brandName", ""),
                    brandTagline = obj.optString("brandTagline", ""),
                    customLogoUrl = obj.optString("customLogoUrl", ""),
                    customHeaderPng = obj.optString("customHeaderPng", ""),
                    whatsappNumber = obj.optString("whatsappNumber", ""),
                    socialHandle = obj.optString("socialHandle", ""),
                    newsUpdateBadge = obj.optString("newsUpdateBadge", ""),
                    customFooterPng = obj.optString("customFooterPng", ""),
                    isConfigured = obj.optBoolean("isConfigured", true)
                )
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return TemplateHeaderFooter(templateId = templateId, isConfigured = false)
    }

    fun saveTemplateConfig(context: Context, config: TemplateHeaderFooter, applyToAll: Boolean) {
        setApplyToAll(context, applyToAll)
        val jsonStr = getConfigsJson(context)
        try {
            val root = if (jsonStr.isNotBlank() && jsonStr != "{}") JSONObject(jsonStr) else JSONObject()
            val obj = JSONObject().apply {
                put("brandName", config.brandName)
                put("brandTagline", config.brandTagline)
                put("customLogoUrl", config.customLogoUrl)
                put("customHeaderPng", config.customHeaderPng)
                put("whatsappNumber", config.whatsappNumber)
                put("socialHandle", config.socialHandle)
                put("newsUpdateBadge", config.newsUpdateBadge)
                put("customFooterPng", config.customFooterPng)
                put("isConfigured", true)
            }

            if (applyToAll) {
                // Save to all available templates
                AVAILABLE_TEMPLATES.forEach { (id, _) ->
                    root.put(id, obj)
                }
            } else {
                root.put(config.templateId, obj)
            }

            getPrefs(context).edit().putString(KEY_CONFIGS, root.toString()).apply()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun deleteTemplateConfig(context: Context, templateId: String) {
        val jsonStr = getConfigsJson(context)
        try {
            val root = JSONObject(jsonStr)
            root.remove(templateId)
            getPrefs(context).edit().putString(KEY_CONFIGS, root.toString()).apply()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }

    fun getFullExportJson(context: Context): String {
        val applyToAll = isApplyToAll(context)
        val configsJson = getConfigsJson(context)
        return try {
            val root = JSONObject()
            root.put("applyToAll", applyToAll)
            root.put("templates", JSONObject(configsJson))
            root.toString()
        } catch (e: Exception) {
            "{}"
        }
    }
}
