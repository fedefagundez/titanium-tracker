import { ref, watch, onMounted } from 'vue'
import { getThreats } from '../api'

export function useThreats(route) {
  const threats = ref({})
  const loading = ref(false)

  async function fetch() {
    if (!route?.value?.route) return
    loading.value = true
    threats.value = {}
    try {
      const ids = route.value.route.map(s => s.id)
      threats.value = await getThreats(ids)
    } catch {
      threats.value = {}
    } finally {
      loading.value = false
    }
  }

  onMounted(fetch)
  watch(() => route?.value, fetch)

  return { threats, loading }
}
