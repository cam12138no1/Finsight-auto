import { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { compare } from 'bcryptjs'

// Demo users for local development (when no database is configured)
// ★ 保留现有用户 admin@example.com，确保向后兼容
const DEMO_USERS = [
  {
    id: '1',
    email: 'admin@example.com',
    name: 'Admin User',
    password: 'admin123',
    role: 'admin',
    permissions: ['read', 'write', 'delete', 'admin'],
  },
  {
    id: '2',
    email: 'analyst1@finsight.internal',
    name: 'Analyst One',
    password: 'Analyst1!',
    role: 'analyst',
    permissions: ['read', 'write'],
  },
  {
    id: '3',
    email: 'analyst2@finsight.internal',
    name: 'Analyst Two',
    password: 'Analyst2!',
    role: 'analyst',
    permissions: ['read', 'write'],
  },
  {
    id: '4',
    email: 'analyst3@finsight.internal',
    name: 'Analyst Three',
    password: 'Analyst3!',
    role: 'analyst',
    permissions: ['read', 'write'],
  },
  {
    id: '5',
    email: 'viewer@finsight.internal',
    name: 'Viewer',
    password: 'Viewer1!',
    role: 'viewer',
    permissions: ['read'],
  },
]

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null
        }

        // Check if database is configured
        const isDatabaseConfigured = !!process.env.DATABASE_URL

        if (!isDatabaseConfigured) {
          // Demo mode: use hardcoded credentials
          const demoUser = DEMO_USERS.find(u => u.email === credentials.email)
          
          if (demoUser && credentials.password === demoUser.password) {
            console.log(`[Auth] Demo login: ${demoUser.email} (ID: ${demoUser.id})`)
            return {
              id: demoUser.id,
              email: demoUser.email,
              name: demoUser.name,
              role: demoUser.role,
              permissions: demoUser.permissions,
            }
          }
          
          console.log(`[Auth] Demo login failed for: ${credentials.email}`)
          return null
        }

        // Production mode: use database
        try {
          const { sql } = await import('@vercel/postgres')
          const result = await sql`
            SELECT id, email, name, password_hash, role, permissions
            FROM users
            WHERE email = ${credentials.email}
          `

          if (result.rows.length === 0) {
            // ★ 兼容模式：如果数据库中找不到，检查是否是demo用户
            const demoUser = DEMO_USERS.find(u => u.email === credentials.email)
            if (demoUser && credentials.password === demoUser.password) {
              console.log(`[Auth] Fallback to demo user: ${demoUser.email}`)
              return {
                id: demoUser.id,
                email: demoUser.email,
                name: demoUser.name,
                role: demoUser.role,
                permissions: demoUser.permissions,
              }
            }
            return null
          }

          const user = result.rows[0]
          const isPasswordValid = await compare(credentials.password, user.password_hash)

          if (!isPasswordValid) {
            return null
          }

          console.log(`[Auth] Database login: ${user.email} (ID: ${user.id})`)
          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            permissions: user.permissions,
          }
        } catch (error) {
          console.error('[Auth] Database error:', error)
          
          // ★ 数据库错误时，尝试使用demo用户
          const demoUser = DEMO_USERS.find(u => u.email === credentials.email)
          if (demoUser && credentials.password === demoUser.password) {
            console.log(`[Auth] Database error, fallback to demo: ${demoUser.email}`)
            return {
              id: demoUser.id,
              email: demoUser.email,
              name: demoUser.name,
              role: demoUser.role,
              permissions: demoUser.permissions,
            }
          }
          
          return null
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.permissions = user.permissions
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.role = token.role as string
        session.user.permissions = token.permissions as string[]
      }
      return session
    }
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  session: {
    strategy: 'jwt',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
  secret: process.env.NEXTAUTH_SECRET,
}

// 导出用户列表供其他模块使用
export const getDemoUsers = () => DEMO_USERS.map(u => ({
  id: u.id,
  email: u.email,
  name: u.name,
  role: u.role,
}))
