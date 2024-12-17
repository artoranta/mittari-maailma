<template>
  <UCard
    v-if="isLoggedIn"
    class="charts-card"
  >
    <div
      v-if="isLoading"
      class="spinner-wrapper"
    >
      <UIcon
        name="i-svg-spinners:180-ring"
        class="spinner w-10 h-10"
      />
    </div>
    <apexchart
      v-if="rows.length"
      :height="350"
      :options="options"
      :series="Object.values(rows.reduce((acc, { name, consumption }) => {
        if (!Object.hasOwnProperty.call(acc, name)) {
          acc[name] = {
            name,
            data: [],
            color: name === 'lämmin' ? '#ff3d36' : '#52a1fe'
          };
        }
        acc[name].data.push(consumption);
        return acc;
      }, {}))"
    />
    <UTable
      :columns="columns"
      :rows="rows"
    />
  </UCard>
</template>

<script>
import { mapState } from 'pinia'
import { sub } from 'date-fns'

export default {
  name: 'Reports',
  components: {
  },
  data() {
    return {
      selected: {
        start: sub(new Date(), { days: 7 }),
        end: new Date(),
      },
      columns: [
        {
          key: 'date',
          label: this.$t('_reports.date'),
          sortable: true,
        },
        {
          key: 'name',
          label: this.$t('_reports.name'),
          sortable: true,
        },
        ...(this.$device.isMobile ? [] : [
          {
            key: 'range',
            label: this.$t('_reports.range'),
          },
        ]),
        {
          key: 'consumption',
          label: this.$t('_reports.consumption'),
          sortable: true,
        },
        ...(this.$device.isMobile ? [] : [
          {
            key: 'count',
            label: this.$t('_reports.count'),
          },
        ]),
      ],
    }
  },
  computed: {
    ...mapState(useMain, {
      isLoggedIn: (store) => store.isLoggedIn,
      isLoading: (store) => !!store.loading.length,
    }),
    ...mapState(useReports, {
      rows: (store) => store.rows,
      options: (store) => store.options,
    }),
  },
  watch: {},
  async created () {
    if (this.isLoggedIn && this.rows.length === 0) {
      await this.getRows(this.selected.start, this.selected.end)
    }
  },
  mounted() {},
  beforeUnmount () {},
  methods: {
    async getRows(start, end) {
      try {
        const reports = useReports()
        await reports.getRows(start, end)
      } catch (err) {
        console.log(err.message)
      }
    },
  },
}

</script>

<style>
.charts-card {
  min-height: 450px;
  width: 100%;
}
.spinner-wrapper {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  width: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
}
.spinner {
  color: #e5e5e5;
}
</style>
