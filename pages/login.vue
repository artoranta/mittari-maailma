<template>
  <UCard>
    <div class="login-container">
      <div class="icon-container">
        <UIcon
          name="i-heroicons-home-modern"
          class="w-10 h-10 text-primary-500"
        />
      </div>
      <UInput
        v-model="username"
        color="primary"
        variant="outline"
        type="username"
        :placeholder="$t('_login.username')"
      />
      <UInput
        v-model="password"
        color="primary"
        variant="outline"
        type="password"
        :placeholder="$t('_login.password')"
      />
      <UButton
        color="gray"
        :label="$t('_login.login')"
        size="sm"
        :disabled="isLoading || !username || !password"
        :loading="isLoading"
        block
        @click="login()"
      />
      <UAlert
        v-if="errorMessage"
        style="height: 52px;"
        icon="i-heroicons-command-line"
      >
        <template #description>
          {{ errorMessage }}
        </template>
      </UAlert>
      <div
        v-else
        style="height: 52px;"
      />
    </div>
  </UCard>
</template>

<script>
import {mapState} from "pinia";

export default {
  name: 'Login',
  components: {},
  data() {
    return {
      username: '',
      password: '',
    }
  },
  computed: {
    ...mapState(useMain, {
      isLoading: (store) => !!store.loading.length,
      isLoggedIn: (store) => store.isLoggedIn,
      errorMessage: (store) => store.errorMessage,
    })
  },
  watch: {},
  created () {
    if (this.isLoggedIn) {
      const router = useRouter()
      router.push('/')
    } else {
      const route = useRoute()
      if (Object.hasOwnProperty.call(route.query, 'username')) {
        this.username = route.query.username
      }
      if (Object.hasOwnProperty.call(route.query, 'password')) {
        this.password = route.query.password
      }
      if (this.username && this.password) {
        this.login()
      }
    }
  },
  mounted() {},
  beforeUnmount () {},
  methods: {
    async login() {
      const main = useMain()
      await main.loginWithToken(this.password, this.username, () => {
        const router = useRouter()
        router.push('/')
      })
    }
  }
}

</script>

<style>
.icon-container {
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 1rem;
}

.login-container {
  display: flex;
  gap: 1rem;
  flex-direction: column;
  min-width: 50vw;
  padding: 2rem 1rem 1rem 1rem;
  @media only screen and (max-width: 600px) {
    min-width: 75vw;
  }
  @media only screen and (min-width: 1000px) and (max-width: 1499px) {
    min-width: 35vw;
  }
  @media only screen and (min-width: 1500px) {
    min-width: 25vw;
  }
}
</style>
