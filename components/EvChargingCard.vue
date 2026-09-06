<template>
    <UCard class="charging-card">
        <div class="charging-header">
            <div>
                <p class="charging-eyebrow">
                    {{ $t('_charging.device') }}
                </p>
                <h2>{{ charger?.name || $t('_charging.deviceName') }}</h2>
            </div>
            <UBadge :color="isCharging ? 'green' : 'gray'" variant="subtle">
                <UIcon name="i-heroicons-bolt-solid" />
                {{ isCharging ? $t('_charging.status.charging') : $t('_charging.status.idle') }}
            </UBadge>
        </div>

        <div class="charging-power">
            <div>
                <span class="charging-label">{{ $t('_charging.power') }}</span>
                <strong>{{ powerKw.toFixed(2) }} kW</strong>
            </div>
            <div class="charging-load">
                <span>{{ loadPercent }}%</span>
                <span>{{ currentAmps.toFixed(1) }} A / {{ maxCurrent }} A</span>
            </div>
        </div>
        <div :style="isCharging ? null : { opacity: 0.2 }">
            <UProgress
                :model-value="loadPercent"
                :max="100"
                size="lg"
                :color="isCharging ? 'green' : 'gray'"
                class="charging-progress"
                :animation="isCharging ? 'carousel' : null"
            />
        </div>
        <dl class="charging-details">
            <div>
                <dt>{{ $t('_charging.started') }}</dt>
                <dd>{{ startedAt ? formatTime(startedAt) : '-' }}</dd>
            </div>
            <div>
                <dt>{{ $t('_charging.duration') }}</dt>
                <dd>{{ formatDuration(durationMinutes) }}</dd>
            </div>
            <div>
                <dt>{{ $t('_charging.energy') }}</dt>
                <dd>{{ sessionEnergy.toFixed(2) }} kWh</dd>
            </div>
            <div>
                <dt>{{ $t('_charging.cost') }}</dt>
                <dd>{{ sessionCost.toFixed(2) }} €</dd>
            </div>
            <div>
                <dt>{{ $t('_charging.price') }}</dt>
                <dd>{{ priceCents.toFixed(2) }} c/kWh</dd>
            </div>
            <div style="display: flex; flex: 1; justify-content: flex-end; justify-items: center; align-items: center;">
                <UButton
                    v-if="mockData === '1'"
                    :icon="isCharging ? 'i-heroicons-stop-20-solid' : 'i-heroicons-play-20-solid'"
                    :color="isCharging ? 'gray' : 'green'"
                    variant="outline"
                    class="mock-charging-button"
                    style="display: flex; justify-content: center; width: 32px; height: 32px;"
                    @click="isCharging ? stopMockCharging() : startMockCharging()"
                >
                </UButton>
            </div>
        </dl>
    </UCard>
</template>

<script>
import { mapState } from 'pinia'
import dayjs from 'dayjs'
import { getMockChargingPower } from '~/stores/measurements'

const maxCurrent = 16
const voltage = 230
const maxPowerKw = voltage * maxCurrent / 1000

export default {
    name: 'EvChargingCard',
    data() {
        return {
            maxCurrent,
            now: new Date(),
            session: null,
            sessionTimer: null,
        }
    },
    computed: {
        ...mapState(useMain, {
            mockData: (store) => store.mockData,
        }),
        ...mapState(useMeasurements, {
            latest: (store) => store.latest,
        }),
        ...mapState(useElectricityPrices, {
            priceCents: (store) => store.currentPriceCents,
        }),
        charger() {
            return this.latest.find(measurement => measurement.media === 'electricity' && measurement.name === 'autonlataus')
        },
        powerKw() {
            if (this.mockData === '1' && this.charger?.power_kw === undefined) return getMockChargingPower(this.now)
            return Number(this.charger?.power_kw || 0)
        },
        isCharging() {
            return this.powerKw > 0.15
        },
        currentAmps() {
            return this.powerKw * 1000 / voltage
        },
        loadPercent() {
            return Math.min(100, Math.max(0, Math.round(this.powerKw / maxPowerKw * 100)))
        },
        startedAt() {
            return this.session?.startTime
        },
        durationMinutes() {
            if (!this.session) return 0
            const end = this.isCharging ? this.now : this.session.endTime
            return Math.max(0, Math.round((new Date(end).getTime() - new Date(this.session.startTime).getTime()) / 60000))
        },
        sessionEnergy() {
            if (!this.session || !this.charger) return 0
            const endEnergy = this.isCharging ? Number(this.charger.total_kwh) : this.session.endEnergy
            return Math.max(0, endEnergy - this.session.startEnergy)
        },
        sessionCost() {
            return this.sessionEnergy * this.priceCents / 100
        },
    },
    watch: {
        isCharging() {
            this.updateSession()
        },
        'charger.total_kwh'() {
            this.updateSession()
        },
        async mockData() {
            await useElectricityPrices().load()
        },
    },
    async mounted() {
        this.restoreSession()
        await useElectricityPrices().load()
        this.sessionTimer = window.setInterval(() => {
            this.now = new Date()
            this.updateSession()
        }, 15000)
    },
    beforeUnmount() {
        window.clearInterval(this.sessionTimer)
    },
    methods: {
        updateSession() {
            if (!this.charger) return
            if (this.isCharging && (!this.session || this.session.endTime)) {
                this.session = {
                    startTime: new Date().toISOString(),
                    startEnergy: Number(this.charger.total_kwh),
                    endTime: null,
                    endEnergy: null,
                }
                this.persistSession()
            } else if (!this.isCharging && this.session && !this.session.endTime) {
                this.session.endTime = new Date().toISOString()
                this.session.endEnergy = Number(this.charger.total_kwh)
                this.persistSession()
            }
        },
        startMockCharging() {
            const measurements = useMeasurements()
            measurements.startMockChargingEvent()
            const charger = measurements.latest.find(measurement => measurement.media === 'electricity' && measurement.name === 'autonlataus')
            if (!charger) return

            const power = Number(charger.power_kw || 2.95)
            this.session = {
                startTime: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
                startEnergy: Number(charger.total_kwh) - power,
                endTime: null,
                endEnergy: null,
            }
            this.persistSession()
            this.now = new Date()
        },
        stopMockCharging() {
            const measurements = useMeasurements()
            measurements.stopMockChargingEvent()
            this.updateSession()
            this.now = new Date()
        },
        restoreSession() {
            const saved = window.localStorage.getItem('evChargingSession')
            this.session = saved ? JSON.parse(saved) : null
            this.updateSession()
        },
        persistSession() {
            window.localStorage.setItem('evChargingSession', JSON.stringify(this.session))
        },
        formatTime(value) {
            return dayjs(value).format('HH:mm')
        },
        formatDuration(minutes) {
            return `${Math.floor(minutes / 60)} h ${minutes % 60} min`
        },
    },
}
</script>

<style scoped>
.charging-card {
    width: 100%;
}

.charging-header,
.charging-power,
.charging-details {
    display: flex;
}

.charging-header,
.charging-power {
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
}

.charging-eyebrow,
.charging-label,
.charging-details dt {
    color: #6b7280;
    font-size: 0.75rem;
    margin: 0;
}

.charging-header h2 {
    font-size: 1.25rem;
    font-weight: 700;
    margin: 0.1rem 0 0;
}

.charging-power {
    margin-top: 1.5rem;
}

.charging-power strong {
    display: block;
    font-size: 2rem;
    line-height: 1.1;
}

.charging-load {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    color: #6b7280;
    font-size: 0.875rem;
}

.charging-load span:first-child {
    color: #16a34a;
    font-size: 1.5rem;
    font-weight: 700;
}

.charging-progress {
    margin-top: 0.75rem;
}

.charging-details {
    flex-wrap: wrap;
    gap: 1rem 2rem;
    margin: 1.5rem 0 0;
}

.charging-details div {
    min-width: 7rem;
}

.charging-details dd {
    font-size: 1rem;
    font-weight: 600;
    margin: 0.2rem 0 0;
}

@media (max-width: 480px) {
    .charging-details {
        gap: 1rem;
    }

    .charging-details div {
        min-width: 6.5rem;
    }
}
</style>