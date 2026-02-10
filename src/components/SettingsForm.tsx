'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Save, Bell, Palette, Globe, DollarSign, Clock } from 'lucide-react'

interface SettingsFormProps {
  projectId: string
  userSettings: any
  project: any
}

export function SettingsForm({ projectId, userSettings, project }: SettingsFormProps) {
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('project')
  const [settings, setSettings] = useState({
    // Project settings
    defaultMarginPercent: 25,
    defaultVatRate: 5,
    currency: 'AED',
    timezone: 'Asia/Dubai',
    dateFormat: 'DD/MM/YYYY',
    emailOnApproval: true,
    emailOnVariation: true,
    
    // User settings
    theme: 'light',
    emailNotifications: true,
    pushNotifications: true,
    marketingEmails: false,
  })
  
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    loadSettings()
  }, [])

  const loadSettings = async () => {
    // Load project settings
    const { data: projectSettings } = await supabase
      .from('project_settings')
      .select('*')
      .eq('project_id', projectId)
      .single()

    // Load user settings
    const { data: { user } } = await supabase.auth.getUser()
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user?.id)
      .single()

    if (projectSettings) {
      setSettings(prev => ({
        ...prev,
        defaultMarginPercent: projectSettings.default_margin_percent || 25,
        defaultVatRate: projectSettings.default_vat_rate || 5,
        currency: projectSettings.currency || 'AED',
        timezone: projectSettings.timezone || 'Asia/Dubai',
        dateFormat: projectSettings.date_format || 'DD/MM/YYYY',
        emailOnApproval: projectSettings.notifications?.email_on_approval ?? true,
        emailOnVariation: projectSettings.notifications?.email_on_variation ?? true,
      }))
    }

    if (userSettings) {
      setSettings(prev => ({
        ...prev,
        theme: userSettings.theme || 'light',
        emailNotifications: userSettings.notifications?.email ?? true,
        pushNotifications: userSettings.notifications?.push ?? true,
        marketingEmails: userSettings.notifications?.marketing ?? false,
      }))
    }
  }

  const handleSaveSettings = async () => {
    setLoading(true)
    
    try {
      // Save project settings
      const { error: projectError } = await supabase
        .from('project_settings')
        .upsert({
          project_id: projectId,
          default_margin_percent: settings.defaultMarginPercent,
          default_vat_rate: settings.defaultVatRate,
          currency: settings.currency,
          timezone: settings.timezone,
          date_format: settings.dateFormat,
          notifications: {
            email_on_approval: settings.emailOnApproval,
            email_on_variation: settings.emailOnVariation,
          },
        }, {
          onConflict: 'project_id'
        })

      // Save user settings
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const { error: userError } = await supabase
          .from('user_settings')
          .upsert({
            user_id: user.id,
            theme: settings.theme,
            notifications: {
              email: settings.emailNotifications,
              push: settings.pushNotifications,
              marketing: settings.marketingEmails,
            },
          }, {
            onConflict: 'user_id'
          })

        if (userError) throw userError
      }

      if (projectError) throw projectError

      alert('Settings saved successfully!')
    } catch (err) {
      console.error('Failed to save settings:', err)
      alert('Failed to save settings')
    } finally {
      setLoading(false)
    }
  }

  const TABS = [
    { id: 'project', label: 'Project Settings', icon: DollarSign },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'display', label: 'Display', icon: Palette },
  ]

  const currencies = ['AED', 'USD', 'EUR', 'GBP']
  const timezones = ['Asia/Dubai', 'Europe/London', 'America/New_York', 'Australia/Sydney']
  const dateFormats = ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD']
  const themes = [
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
    { value: 'auto', label: 'Auto' },
  ]

  return (
    <div className="p-6">
      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          {TABS.map(tab => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      <div className="max-w-2xl">
        {/* Project Settings */}
        {activeTab === 'project' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Project Configuration</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Margin (%)
                  </label>
                  <input
                    type="number"
                    value={settings.defaultMarginPercent}
                    onChange={(e) => setSettings(prev => ({ ...prev, defaultMarginPercent: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default VAT Rate (%)
                  </label>
                  <input
                    type="number"
                    value={settings.defaultVatRate}
                    onChange={(e) => setSettings(prev => ({ ...prev, defaultVatRate: parseFloat(e.target.value) }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    min="0"
                    max="100"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Currency
                  </label>
                  <select
                    value={settings.currency}
                    onChange={(e) => setSettings(prev => ({ ...prev, currency: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    {currencies.map(curr => (
                      <option key={curr} value={curr}>{curr}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Timezone
                  </label>
                  <select
                    value={settings.timezone}
                    onChange={(e) => setSettings(prev => ({ ...prev, timezone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    {timezones.map(tz => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Date Format
                  </label>
                  <select
                    value={settings.dateFormat}
                    onChange={(e) => setSettings(prev => ({ ...prev, dateFormat: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                  >
                    {dateFormats.map(format => (
                      <option key={format} value={format}>{format}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <h4 className="text-md font-medium text-gray-900 mb-3">Email Notifications</h4>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.emailOnApproval}
                    onChange={(e) => setSettings(prev => ({ ...prev, emailOnApproval: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Email on approvals</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.emailOnVariation}
                    onChange={(e) => setSettings(prev => ({ ...prev, emailOnVariation: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Email on variations</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* Notifications Settings */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Notification Preferences</h3>
            
            <div className="space-y-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.emailNotifications}
                  onChange={(e) => setSettings(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Email notifications</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.pushNotifications}
                  onChange={(e) => setSettings(prev => ({ ...prev, pushNotifications: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Push notifications</span>
              </label>
              
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={settings.marketingEmails}
                  onChange={(e) => setSettings(prev => ({ ...prev, marketingEmails: e.target.checked }))}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Marketing emails</span>
              </label>
            </div>
          </div>
        )}

        {/* Display Settings */}
        {activeTab === 'display' && (
          <div className="space-y-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Display Preferences</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Theme
              </label>
              <select
                value={settings.theme}
                onChange={(e) => setSettings(prev => ({ ...prev, theme: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
              >
                {themes.map(theme => (
                  <option key={theme.value} value={theme.value}>{theme.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Save Button */}
        <div className="mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={handleSaveSettings}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Save className="h-4 w-4" />
            {loading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  )
}