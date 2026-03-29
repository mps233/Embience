import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

function createAssrtFileProxyPlugin() {
  return {
    name: 'assrt-file-proxy',
    configureServer(server: any) {
      server.middlewares.use('/api/assrt/file', async (req: any, res: any, next: any) => {
        const requestUrl = req.url || ''
        const match = requestUrl.match(/^\/(https?)\/([^/]+)\/(.*)$/)

        if (!match) {
          next()
          return
        }

        const [, protocol, host, pathnameWithQuery] = match
        const upstreamUrl = `${protocol}://${host}/${pathnameWithQuery}`

        try {
          const upstreamResponse = await fetch(upstreamUrl, {
            method: 'GET',
            headers: {
              Accept: req.headers.accept || '*/*',
            },
          })

          res.statusCode = upstreamResponse.status

          const allowedHeaders = [
            'content-type',
            'content-length',
            'content-disposition',
            'cache-control',
            'expires',
            'last-modified',
          ]

          allowedHeaders.forEach((headerName) => {
            const headerValue = upstreamResponse.headers.get(headerName)
            if (headerValue) {
              res.setHeader(headerName, headerValue)
            }
          })

          const buffer = Buffer.from(await upstreamResponse.arrayBuffer())
          res.end(buffer)
        } catch (error) {
          res.statusCode = 502
          res.setHeader('Content-Type', 'application/json; charset=utf-8')
          res.end(
            JSON.stringify({
              message: error instanceof Error ? error.message : 'ASSRT 文件代理失败',
            })
          )
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const openSubtitlesProxy = {
    target: 'https://api.opensubtitles.com',
    changeOrigin: true,
    configure: (proxy: any) => {
      proxy.on('proxyReq', (proxyReq: any) => {
        if (env.OPENSUBTITLES_API_KEY) {
          proxyReq.setHeader('Api-Key', env.OPENSUBTITLES_API_KEY)
        }
        proxyReq.setHeader(
          'User-Agent',
          env.OPENSUBTITLES_USER_AGENT || 'Embience v1.0.0'
        )
        proxyReq.setHeader('Accept', 'application/json')
      })
    },
  }
  const assrtProxy = {
    target: 'https://api.assrt.net',
    changeOrigin: true,
    configure: (proxy: any) => {
      proxy.on('proxyReq', (proxyReq: any) => {
        if (env.ASSRT_TOKEN) {
          proxyReq.setHeader('Authorization', `Bearer ${env.ASSRT_TOKEN}`)
        }
        proxyReq.setHeader('Accept', 'application/json')
      })
    },
  }

  return {
    plugins: [react(), createAssrtFileProxyPlugin()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      proxy: {
        '/emby': {
          target: env.VITE_EMBY_SERVER_URL || 'http://localhost:8096',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/emby/, '/emby'),
        },
        '/api/opensubtitles': {
          ...openSubtitlesProxy,
          rewrite: (path) => path.replace(/^\/api\/opensubtitles/, '/api/v1'),
        },
        '/api/v1': {
          ...openSubtitlesProxy,
        },
        '/api/assrt': {
          ...assrtProxy,
          rewrite: (path) => path.replace(/^\/api\/assrt/, '/v1'),
        },
      },
    },
    build: {
      target: 'es2015',
      minify: 'terser',
      rollupOptions: {
        output: {
          manualChunks: (id) => {
            if (id.includes('node_modules')) {
              if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
                return 'react-vendor'
              }
              if (id.includes('@radix-ui')) {
                return 'ui-vendor'
              }
              if (id.includes('video.js') || id.includes('howler')) {
                return 'player-vendor'
              }
            }
          },
        },
      },
    },
  }
})
