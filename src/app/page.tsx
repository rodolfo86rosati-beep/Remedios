"use client"

import { useState, useEffect } from "react"
import { Plus, Pill, Clock, Check, X, Bell, BellOff, Trash2, Calendar, Download } from "lucide-react"
import { toast } from "sonner"

interface Medication {
  id: string
  name: string
  dosage: string
  times: string[]
  color: string
  taken: { [key: string]: boolean }
  active: boolean
}

const COLORS = [
  "from-blue-500 to-cyan-500",
  "from-purple-500 to-pink-500",
  "from-emerald-500 to-teal-500",
  "from-orange-500 to-red-500",
  "from-indigo-500 to-blue-500",
  "from-pink-500 to-rose-500",
]

export default function MedicationTracker() {
  const [medications, setMedications] = useState<Medication[]>([])
  const [showAddForm, setShowAddForm] = useState(false)
  const [notificationsEnabled, setNotificationsEnabled] = useState(false)
  const [currentTime, setCurrentTime] = useState(new Date())
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [showInstallButton, setShowInstallButton] = useState(false)

  // Form states
  const [newMedName, setNewMedName] = useState("")
  const [newMedDosage, setNewMedDosage] = useState("")
  const [newMedTimes, setNewMedTimes] = useState<string[]>([""])

  // Load medications from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("medications")
    if (saved) {
      setMedications(JSON.parse(saved))
    }

    // Check notification permission
    if ("Notification" in window && Notification.permission === "granted") {
      setNotificationsEnabled(true)
    }

    // Listen for PWA install prompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setShowInstallButton(true)
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt)

    // Check if already installed
    if (window.matchMedia("(display-mode: standalone)").matches) {
      setShowInstallButton(false)
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt)
    }
  }, [])

  // Save medications to localStorage
  useEffect(() => {
    if (medications.length > 0) {
      localStorage.setItem("medications", JSON.stringify(medications))
    }
  }, [medications])

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 60000)
    return () => clearInterval(timer)
  }, [])

  // Check for medication reminders
  useEffect(() => {
    if (!notificationsEnabled) return

    const checkReminders = () => {
      const now = new Date()
      const currentTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
      const today = now.toDateString()

      medications.forEach((med) => {
        if (!med.active) return

        med.times.forEach((time) => {
          if (time === currentTimeStr && !med.taken[today]) {
            new Notification(`⏰ Hora do medicamento!`, {
              body: `${med.name} - ${med.dosage}`,
              icon: "/icon.svg",
              tag: med.id + time,
            })
            toast.info(`Hora de tomar: ${med.name}`, {
              description: med.dosage,
            })
          }
        })
      })
    }

    const interval = setInterval(checkReminders, 60000)
    checkReminders() // Check immediately
    return () => clearInterval(interval)
  }, [medications, notificationsEnabled])

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      toast.info("O app já está instalado ou seu navegador não suporta instalação")
      return
    }

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === "accepted") {
      toast.success("App instalado com sucesso! 🎉")
      setShowInstallButton(false)
    } else {
      toast.info("Instalação cancelada")
    }

    setDeferredPrompt(null)
  }

  const toggleNotifications = async () => {
    if (notificationsEnabled) {
      // Desativar alarmes
      setNotificationsEnabled(false)
      toast.info("Alarmes desativados")
      return
    }

    // Ativar alarmes - solicitar permissão
    if (!("Notification" in window)) {
      toast.error("Seu navegador não suporta notificações")
      return
    }

    const permission = await Notification.requestPermission()
    if (permission === "granted") {
      setNotificationsEnabled(true)
      toast.success("Alarmes ativados! Você receberá notificações nos horários configurados.")
    } else {
      toast.error("Permissão de notificação negada. Ative nas configurações do navegador.")
    }
  }

  const addMedication = () => {
    if (!newMedName.trim() || !newMedDosage.trim() || newMedTimes.some((t) => !t)) {
      toast.error("Preencha todos os campos")
      return
    }

    const newMed: Medication = {
      id: Date.now().toString(),
      name: newMedName,
      dosage: newMedDosage,
      times: newMedTimes.filter((t) => t),
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      taken: {},
      active: true,
    }

    setMedications([...medications, newMed])
    setNewMedName("")
    setNewMedDosage("")
    setNewMedTimes([""])
    setShowAddForm(false)
    toast.success("Medicamento adicionado!")
  }

  const toggleTaken = (medId: string, time: string) => {
    const today = currentTime.toDateString()
    setMedications(
      medications.map((med) => {
        if (med.id === medId) {
          const key = `${today}-${time}`
          return {
            ...med,
            taken: {
              ...med.taken,
              [key]: !med.taken[key],
            },
          }
        }
        return med
      })
    )
  }

  const deleteMedication = (medId: string) => {
    setMedications(medications.filter((med) => med.id !== medId))
    toast.success("Medicamento removido")
  }

  const addTimeSlot = () => {
    setNewMedTimes([...newMedTimes, ""])
  }

  const updateTimeSlot = (index: number, value: string) => {
    const updated = [...newMedTimes]
    updated[index] = value
    setNewMedTimes(updated)
  }

  const removeTimeSlot = (index: number) => {
    setNewMedTimes(newMedTimes.filter((_, i) => i !== index))
  }

  const getUpcomingMedications = () => {
    const now = new Date()
    const currentTimeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`
    const today = currentTime.toDateString()

    const upcoming: Array<{ med: Medication; time: string; isPast: boolean }> = []

    medications.forEach((med) => {
      if (!med.active) return
      med.times.forEach((time) => {
        const key = `${today}-${time}`
        const isTaken = med.taken[key]
        const isPast = time < currentTimeStr
        if (!isTaken) {
          upcoming.push({ med, time, isPast })
        }
      })
    })

    return upcoming.sort((a, b) => a.time.localeCompare(b.time))
  }

  const upcomingMeds = getUpcomingMedications()

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900">
      {/* Header */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 sm:p-3 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl shadow-lg">
                <Pill className="w-6 h-6 sm:w-8 sm:h-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  MedTracker
                </h1>
                <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                  {currentTime.toLocaleDateString("pt-BR", { 
                    weekday: "long", 
                    day: "numeric", 
                    month: "long" 
                  })}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
              {showInstallButton && (
                <button
                  onClick={handleInstallClick}
                  className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 text-sm sm:text-base"
                >
                  <Download className="w-4 h-4" />
                  <span className="hidden sm:inline">Instalar App</span>
                  <span className="sm:hidden">Instalar</span>
                </button>
              )}

              <button
                onClick={toggleNotifications}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-xl transition-all duration-300 text-sm sm:text-base ${
                  notificationsEnabled
                    ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/50"
                    : "bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600"
                }`}
              >
                {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                <span className="hidden sm:inline">
                  {notificationsEnabled ? "Alarmes Ativos" : "Ativar Alarmes"}
                </span>
              </button>

              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="flex items-center gap-2 px-3 sm:px-4 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 text-sm sm:text-base flex-1 sm:flex-initial justify-center"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                <span>Adicionar</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Add Medication Form */}
        {showAddForm && (
          <div className="mb-6 sm:mb-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-4 sm:p-6 border border-gray-200 dark:border-gray-700 animate-in fade-in slide-in-from-top-4 duration-300">
            <h2 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-100">
              <Plus className="w-5 h-5" />
              Novo Medicamento
            </h2>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Nome do Medicamento
                </label>
                <input
                  type="text"
                  value={newMedName}
                  onChange={(e) => setNewMedName(e.target.value)}
                  placeholder="Ex: Paracetamol"
                  className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Dosagem
                </label>
                <input
                  type="text"
                  value={newMedDosage}
                  onChange={(e) => setNewMedDosage(e.target.value)}
                  placeholder="Ex: 500mg - 1 comprimido"
                  className="w-full px-4 py-2.5 sm:py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">
                  Horários
                </label>
                <div className="space-y-2">
                  {newMedTimes.map((time, index) => (
                    <div key={index} className="flex gap-2">
                      <input
                        type="time"
                        value={time}
                        onChange={(e) => updateTimeSlot(index, e.target.value)}
                        className="flex-1 px-4 py-2.5 sm:py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      />
                      {newMedTimes.length > 1 && (
                        <button
                          onClick={() => removeTimeSlot(index)}
                          className="px-3 py-2 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl hover:bg-red-200 dark:hover:bg-red-900/50 transition-all"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      )}
                    </div>
                  ))}
                  <button
                    onClick={addTimeSlot}
                    className="w-full px-4 py-2.5 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl text-gray-600 dark:text-gray-400 hover:border-blue-500 hover:text-blue-500 dark:hover:border-blue-400 dark:hover:text-blue-400 transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Horário
                  </button>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={addMedication}
                  className="flex-1 px-4 py-2.5 sm:py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 font-medium"
                >
                  Salvar Medicamento
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2.5 sm:py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Upcoming Medications */}
        {upcomingMeds.length > 0 && (
          <div className="mb-6 sm:mb-8">
            <h2 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-100">
              <Clock className="w-5 h-5" />
              Próximos Medicamentos
            </h2>
            <div className="grid gap-3 sm:gap-4">
              {upcomingMeds.slice(0, 3).map(({ med, time, isPast }) => {
                const today = currentTime.toDateString()
                const key = `${today}-${time}`
                return (
                  <div
                    key={`${med.id}-${time}`}
                    className={`bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-5 shadow-lg border-l-4 transition-all duration-300 hover:shadow-xl ${
                      isPast
                        ? "border-orange-500 bg-orange-50/50 dark:bg-orange-900/10"
                        : "border-green-500"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className={`p-2 sm:p-3 bg-gradient-to-br ${med.color} rounded-xl sm:rounded-2xl shadow-md flex-shrink-0`}>
                          <Pill className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-base sm:text-lg text-gray-800 dark:text-gray-100 truncate">
                            {med.name}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 truncate">
                            {med.dosage}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gray-500" />
                            <span className={`text-xs sm:text-sm font-medium ${
                              isPast ? "text-orange-600 dark:text-orange-400" : "text-green-600 dark:text-green-400"
                            }`}>
                              {time} {isPast && "(Atrasado)"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => toggleTaken(med.id, time)}
                        className={`p-2 sm:p-3 rounded-xl transition-all duration-300 flex-shrink-0 ${
                          med.taken[key]
                            ? "bg-green-500 text-white shadow-lg"
                            : "bg-gray-100 dark:bg-gray-700 text-gray-400 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-600 dark:hover:text-green-400"
                        }`}
                      >
                        <Check className="w-5 h-5 sm:w-6 sm:h-6" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* All Medications */}
        <div>
          <h2 className="text-lg sm:text-xl font-bold mb-4 flex items-center gap-2 text-gray-800 dark:text-gray-100">
            <Calendar className="w-5 h-5" />
            Todos os Medicamentos ({medications.length})
          </h2>

          {medications.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-8 sm:p-12 text-center shadow-lg border border-gray-200 dark:border-gray-700">
              <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Pill className="w-8 h-8 sm:w-10 sm:h-10 text-blue-500" />
              </div>
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">
                Nenhum medicamento cadastrado
              </h3>
              <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 mb-6">
                Adicione seu primeiro medicamento para começar o acompanhamento
              </p>
              <button
                onClick={() => setShowAddForm(true)}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-xl hover:shadow-lg transition-all duration-300 inline-flex items-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Adicionar Medicamento
              </button>
            </div>
          ) : (
            <div className="grid gap-4 sm:gap-6">
              {medications.map((med) => {
                const today = currentTime.toDateString()
                return (
                  <div
                    key={med.id}
                    className="bg-white dark:bg-gray-800 rounded-xl sm:rounded-2xl p-4 sm:p-6 shadow-lg border border-gray-200 dark:border-gray-700 hover:shadow-xl transition-all duration-300"
                  >
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex items-start gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className={`p-2 sm:p-3 bg-gradient-to-br ${med.color} rounded-xl sm:rounded-2xl shadow-md flex-shrink-0`}>
                          <Pill className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-bold text-lg sm:text-xl text-gray-800 dark:text-gray-100 mb-1 break-words">
                            {med.name}
                          </h3>
                          <p className="text-sm sm:text-base text-gray-600 dark:text-gray-400 break-words">
                            {med.dosage}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => deleteMedication(med.id)}
                        className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all flex-shrink-0"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <div className="space-y-2">
                      {med.times.map((time) => {
                        const key = `${today}-${time}`
                        const isTaken = med.taken[key]
                        return (
                          <div
                            key={time}
                            className={`flex items-center justify-between p-3 sm:p-4 rounded-xl transition-all duration-300 ${
                              isTaken
                                ? "bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                                : "bg-gray-50 dark:bg-gray-700/50 border border-gray-200 dark:border-gray-600"
                            }`}
                          >
                            <div className="flex items-center gap-2 sm:gap-3">
                              <Clock className={`w-4 h-4 sm:w-5 sm:h-5 ${
                                isTaken ? "text-green-600 dark:text-green-400" : "text-gray-500 dark:text-gray-400"
                              }`} />
                              <span className={`font-medium text-sm sm:text-base ${
                                isTaken ? "text-green-700 dark:text-green-300" : "text-gray-700 dark:text-gray-300"
                              }`}>
                                {time}
                              </span>
                              {isTaken && (
                                <span className="text-xs sm:text-sm text-green-600 dark:text-green-400 font-medium">
                                  ✓ Tomado
                                </span>
                              )}
                            </div>
                            <button
                              onClick={() => toggleTaken(med.id, time)}
                              className={`p-2 rounded-lg transition-all duration-300 ${
                                isTaken
                                  ? "bg-green-500 text-white hover:bg-green-600"
                                  : "bg-white dark:bg-gray-600 text-gray-400 hover:bg-green-100 dark:hover:bg-green-900/30 hover:text-green-600 dark:hover:text-green-400 border border-gray-300 dark:border-gray-500"
                              }`}
                            >
                              <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                            </button>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Floating Add Button - Visible on mobile when scrolled */}
        <button
          onClick={() => setShowAddForm(true)}
          className="fixed bottom-6 right-6 p-4 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-full shadow-2xl hover:shadow-3xl transition-all duration-300 z-50 md:hidden"
          aria-label="Adicionar medicamento"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </div>
  )
}
