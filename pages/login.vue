<template>
  <UCard class="login-container">
    <div class="login-card-body">
      <div class="icon-container">
        <UIcon
          name="i-heroicons-home-modern"
          class="w-10 h-10 text-primary-500"
        />
      </div>
      <UInput
        v-if="isAuthenticated"
        v-model="password"
        color="primary"
        variant="outline"
        type="password"
        :placeholder="$t('_login.password')"
      />
      <UButton
        v-if="isAuthenticated"
        color="gray"
        :label="$t('_login.continue')"
        size="sm"
        :disabled="isLoading || !password"
        :loading="isLoading"
        block
        @click="login()"
      />
      <UButton
        v-if="isAuthenticated"
        color="gray"
        :label="$t('_login.cancel')"
        size="sm"
        :disabled="isLoading"
        block
        @click="logout()"
      />
      <button
        v-if="!isAuthenticated"
        class="gsi-material-button"
        @click="handleGoogleLogin"
      >
        <div class="gsi-material-button-state"></div>
        <div class="gsi-material-button-content-wrapper">
          <div class="gsi-material-button-icon">
            <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" xmlns:xlink="http://www.w3.org/1999/xlink" style="display: block;">
              <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
              <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
              <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
              <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
              <path fill="none" d="M0 0h48v48H0z"></path>
            </svg>
          </div>
          <span class="gsi-material-button-contents">Sign in with Google</span>
          <span style="display: none;">Sign in with Google</span>
        </div>
      </button>
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
import { mapState } from 'pinia'
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup } from 'firebase/auth'

export default {
  name: 'Login',
  components: {},
  data() {
    return {
      password: ''
    }
  },
  computed: {
    ...mapState(useMain, {
      isLoading: (store) => !!store.loading.length,
      isLoggedIn: (store) => store.isLoggedIn,
      isAuthenticated: (store) => store.isAuthenticated,
      errorMessage: (store) => store.errorMessage,
      firebaseConfig: (store) => store.firebaseConfig,
    }),
  },
  watch: {},
  async created () {
    if (this.isLoggedIn) {
      const measurements = useMeasurements()
      await measurements.getLatest()
      const router = useRouter()
      await router.push('/')
    } else {
      const route = useRoute()
      if (Object.hasOwnProperty.call(route.query, 'password')) {
        this.password = route.query.password
      }
      if (this.password && this.token) {
        await this.login()
      }
    }
  },
  mounted() {},
  beforeUnmount () {},
  methods: {
    async login() {
      const main = useMain()
      await main.loginWithToken(this.password, () => {
        const router = useRouter()
        router.push('/')
      })
    },
    async logout() {
      const router = useRouter()
      await router.push('/logout')
    },
    async handleGoogleLogin() {
      try {
        const main = useMain()
        const app = initializeApp(this.firebaseConfig)
        const auth = getAuth(app)
        const provider = new GoogleAuthProvider()
        const result = await signInWithPopup(auth, provider)
        if (result) {
          const user = result.user
          await main.setAuthUser(user)
          if (this.isLoggedIn) {
            await this.login()
          }
        }
      } catch (error) {
        console.error(error)
      }
    }
  },
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
  margin-top: 10rem;
}

.login-card-body {
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

.gsi-material-button {
  -moz-user-select: none;
  -webkit-user-select: none;
  -ms-user-select: none;
  -webkit-appearance: none;
  background-color: WHITE;
  background-image: none;
  border: 1px solid;
  border-color: rgb(var(--color-gray-200) / 1);
  -webkit-border-radius: 4px;
  border-radius: 4px;
  -webkit-box-sizing: border-box;
  box-sizing: border-box;
  color: #1f1f1f;
  cursor: pointer;
  font-family: 'Roboto', arial, sans-serif;
  font-size: 14px;
  height: 40px;
  letter-spacing: 0.25px;
  outline: none;
  overflow: hidden;
  padding: 0 12px;
  position: relative;
  text-align: center;
  -webkit-transition: background-color .218s, border-color .218s, box-shadow .218s;
  transition: background-color .218s, border-color .218s, box-shadow .218s;
  vertical-align: middle;
  white-space: nowrap;
  width: auto;
  min-width: min-content;
}

.gsi-material-button .gsi-material-button-icon {
  height: 20px;
  margin-right: 10px;
  min-width: 20px;
  width: 20px;
}

.gsi-material-button .gsi-material-button-content-wrapper {
  -webkit-align-items: center;
  align-items: center;
  display: flex;
  -webkit-flex-direction: row;
  flex-direction: row;
  -webkit-flex-wrap: nowrap;
  flex-wrap: nowrap;
  height: 100%;
  justify-content: space-between;
  position: relative;
  width: 100%;
}

.gsi-material-button .gsi-material-button-contents {
  -webkit-flex-grow: 1;
  flex-grow: 1;
  font-family: 'Roboto', arial, sans-serif;
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  vertical-align: top;
}

.gsi-material-button .gsi-material-button-state {
  -webkit-transition: opacity .218s;
  transition: opacity .218s;
  bottom: 0;
  left: 0;
  opacity: 0;
  position: absolute;
  right: 0;
  top: 0;
}

.gsi-material-button:disabled {
  cursor: default;
  background-color: #ffffff61;
  border-color: #1f1f1f1f;
}

.gsi-material-button:disabled .gsi-material-button-contents {
  opacity: 38%;
}

.gsi-material-button:disabled .gsi-material-button-icon {
  opacity: 38%;
}

.gsi-material-button:not(:disabled):active .gsi-material-button-state, 
.gsi-material-button:not(:disabled):focus .gsi-material-button-state {
  background-color: #303030;
  opacity: 12%;
}

.gsi-material-button:not(:disabled):hover {
  -webkit-box-shadow: 0 1px 2px 0 rgba(60, 64, 67, .30), 0 1px 3px 1px rgba(60, 64, 67, .15);
  box-shadow: 0 1px 2px 0 rgba(60, 64, 67, .30), 0 1px 3px 1px rgba(60, 64, 67, .15);
}

.gsi-material-button:not(:disabled):hover .gsi-material-button-state {
  background-color: #303030;
  opacity: 8%;
}
</style>
