package com.example.workoutprogram.data

import com.sun.net.httpserver.HttpServer
import org.junit.After
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNull
import org.junit.Test
import java.io.IOException
import java.net.InetSocketAddress

class WeekApiTest {
    private var status = 200
    private var method = ""
    private var path = ""
    private var contentType: String? = null
    private var authorization: String? = null
    private var body = ""
    private var responseBody: String? = null

    private val server = HttpServer.create(InetSocketAddress("127.0.0.1", 0), 0).apply {
        createContext("/") { exchange ->
            method = exchange.requestMethod
            path = exchange.requestURI.path
            contentType = exchange.requestHeaders.getFirst("Content-Type")
            authorization = exchange.requestHeaders.getFirst("Authorization")
            body = exchange.requestBody.readBytes().decodeToString()
            val response = responseBody?.toByteArray()
            exchange.sendResponseHeaders(status, response?.size?.toLong() ?: -1)
            response?.let { exchange.responseBody.write(it) }
            exchange.close()
        }
        start()
    }

    private var token: String? = "session-1"
    private val api = WeekApi("http://127.0.0.1:${server.address.port}") { token }

    @After
    fun stopServer() = server.stop(0)

    @Test
    fun saveProgress_putsTheJsonToTheWeek() {
        api.saveProgress("w9", """{"note":"Rūta"}""")

        assertEquals("PUT", method)
        assertEquals("/api/me/weeks/w9/progress", path)
        assertEquals("application/json", contentType)
        assertEquals("""{"note":"Rūta"}""", body)
    }

    @Test
    fun saveProgress_sendsTheSession() {
        api.saveProgress("w9", "{}")

        assertEquals("Bearer session-1", authorization)
    }

    @Test
    fun saveProgress_dropsProgressForAWeekThatIsNoLongerCurrent() {
        status = 409

        api.saveProgress("old", "{}")
    }

    @Test(expected = IOException::class)
    fun saveProgress_failsWhenTheServerErrors() {
        status = 500

        api.saveProgress("w9", "{}")
    }

    @Test(expected = SignedOutException::class)
    fun saveProgress_saysWhenTheSessionHasEnded() {
        status = 401

        api.saveProgress("w9", "{}")
    }

    @Test(expected = SignedOutException::class)
    fun currentWeek_needsASession() {
        token = null

        api.currentWeek()
    }

    @Test
    fun signInWithGoogle_tradesTheIdTokenForASession() {
        responseBody = """{"token":"session-2","clientId":"me"}"""

        assertEquals(SignInResult.SignedIn("session-2", "me"), api.signInWithGoogle("from-google"))
        assertEquals("POST", method)
        assertEquals("/api/auth/google", path)
        assertEquals("""{"idToken":"from-google"}""", body)
        assertNull(authorization)
    }

    @Test
    fun signInWithGoogle_passesOnWhyTheServerRefused() {
        status = 403
        responseBody = """{"errors":["Your coach hasn't added you yet."]}"""

        assertEquals(SignInResult.Refused("Your coach hasn't added you yet."), api.signInWithGoogle("from-google"))
    }

    @Test(expected = IOException::class)
    fun signInWithGoogle_failsWhenTheServerGivesNoReason() {
        status = 502

        api.signInWithGoogle("from-google")
    }

    @Test
    fun signOut_endsTheGivenSession() {
        api.signOut("session-1")

        assertEquals("POST", method)
        assertEquals("/api/auth/sign-out", path)
        assertEquals("Bearer session-1", authorization)
    }

    @Test
    fun pastWeeks_getsTheClientsPastWeeks() {
        responseBody = "[]"

        assertEquals("[]", api.pastWeeks())
        assertEquals("GET", method)
        assertEquals("/api/me/past-weeks", path)
    }

    @Test(expected = IOException::class)
    fun pastWeeks_failsWhenTheServerErrors() {
        status = 500

        api.pastWeeks()
    }
}
