import React from 'react'
import Navbar from '../components/navbar'
import BlogHome from './components/bloghome'
import Footer from '../components/footer'

export default function blogs() {
    return (
        <main>
            <Navbar />

            <BlogHome />

            <Footer />

        </main>
    )
}