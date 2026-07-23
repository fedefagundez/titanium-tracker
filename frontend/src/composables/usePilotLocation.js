import { ref, onMounted, onUnmounted } from 'vue'
import { getCharacterLocation } from '../api'

export function usePilotLocation(route) {
  const currentSystemId = ref(null)
  const currentSystemName = ref(null)
  let interval = null

  async function fetch() {
    try {
      const data = await getCharacterLocation()
      currentSystemId.value = data.solar_system_id
      if (route?.value?.route) {
        const node = route.value.route.find(s => s.id === data.solar_system_id)
        currentSystemName.value = node ? node.name : null
      }
    } catch {
      currentSystemId.value = null
      currentSystemName.value = null
    }
  }

  onMounted(() => {
    fetch()
    interval = setInterval(fetch, 30000)
  })

  onUnmounted(() => {
    if (interval) clearInterval(interval)
  })

  return { currentSystemId, currentSystemName }
}
