import {
  defineNuxtModule,
  addPlugin,
  addComponentsDir,
  resolveModule,
  createResolver,
  addVitePlugin
} from '@nuxt/kit'
import { name, version } from '../package.json'

export interface NuxtSsrLitOptions {
  litElementPrefix: string,
  templateSources?: string[]
}

export default defineNuxtModule<NuxtSsrLitOptions>({
  meta: {
    name,
    version,
    configKey: 'nuxtSsrLit'
  },
  defaults: {
    litElementPrefix: '',
    templateSources: ['pages', 'components', 'layouts', 'app.vue']
  },
  async setup (options, nuxt) {
    const { resolve } = createResolver(import.meta.url)
    const resolveRuntimeModule = (path: string) => resolveModule(path, { paths: resolve('./runtime') })

    addPlugin(resolveRuntimeModule('./plugins/shim.server'))
    addPlugin(resolveRuntimeModule('./plugins/shim.client'))
    addPlugin(resolveRuntimeModule('./plugins/hydrateSupport.client'))

    await addComponentsDir({ path: resolve('./runtime/components') })

    nuxt.options.nitro.moduleSideEffects = nuxt.options.nitro.moduleSideEffects || []
    nuxt.options.nitro.moduleSideEffects.push('@lit-labs/ssr/lib/render-lit-html.js')

    const isCustomElement = nuxt.options.vue.compilerOptions.isCustomElement || (() => false)
    nuxt.options.vue.compilerOptions.isCustomElement = tag => tag.startsWith(options.litElementPrefix) || isCustomElement(tag)

    const srcDir = nuxt.options.srcDir

    addVitePlugin({
      name: 'autoLitWrapper',
      transform (code, id) {
        const skipTransform = id.includes('node_modules') || !options.templateSources.some(dir => id.includes(`${srcDir}/${dir}`))

        if (skipTransform) { return }

        const openTagRegex = new RegExp(`<(${options.litElementPrefix}[a-z-]+)`, 'g')
        const endTagRegex = new RegExp(`<\\/(${options.litElementPrefix}[a-z-]+)>`, 'g')

        const result = code
          .replace(openTagRegex, '<LitWrapper><$1')
          .replace(endTagRegex, '</$1></LitWrapper>')

        return result
      }
    })
  }
})
