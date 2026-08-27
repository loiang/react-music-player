import React from 'react'
import { mount } from 'enzyme'
import ReactJkMusicPlayer from '../../src'
import lyric from '../../example/lyric'
import { sleep } from '../utils'

const timedLyricData = {
  kind: 'timed',
  lines: [
    { start: 1000, end: 2000, value: 'Timed line 1' },
    { start: 3000, end: 4000, value: 'Timed line 2' },
  ],
}

const createPlayer = (props) => (
  <ReactJkMusicPlayer
    showLyric
    audioLists={[
      {
        musicSrc: 'xx',
        name: 'audioName',
        lyric,
      },
      {
        musicSrc: 'xx2',
        name: 'audioName2',
      },
    ]}
    mode="full"
    {...props}
  />
)

describe('Lyric test', () => {
  it('should get initial lyric', () => {
    const wrapper = mount(createPlayer())
    expect(wrapper.state().lyric).toEqual(lyric)
  })
  it('should active lyric button when current clicked', () => {
    const wrapper = mount(createPlayer())
    expect(wrapper.find('.lyric-btn.lyric-btn-active')).toHaveLength(0)
    wrapper.find('.lyric-btn').simulate('click')
    expect(wrapper.find('.lyric-btn.lyric-btn-active').exists()).toBeTruthy()
  })
  it.skip('should call onAudioLyricChange when audio playing', () => {
    const onAudioLyricChange = jest.fn()
    const wrapper = mount(createPlayer({ onAudioLyricChange }))
    wrapper.setState({ loading: false }, () => {
      wrapper.find('.play-btn').simulate('click')

      sleep(1000).then(() => {
        expect(onAudioLyricChange).toHaveBeenCalled()
      })
    })
  })

  it.skip('should call onAudioLyricChange when audio auto play', () => {
    const onAudioLyricChange = jest.fn()
    mount(createPlayer({ autoPlay: true, onAudioLyricChange }))
    sleep(1000).then(() => {
      expect(onAudioLyricChange).toHaveBeenCalled()
    })
  })

  it.skip('should toggle call onAudioLyricChange when audio pause', async () => {
    const onAudioLyricChange = jest.fn()
    const wrapper = mount(createPlayer({ onAudioLyricChange }))
    wrapper.setState({ loading: false })
    wrapper.find('.play-btn').simulate('click')

    await sleep(1000)
    expect(onAudioLyricChange).toHaveBeenCalledTimes(1)

    wrapper.find('.play-btn').simulate('click')
    await sleep(1000)
    expect(onAudioLyricChange).toHaveBeenCalledTimes(1)
  })

  it.skip('should toggle call onAudioLyricChange when audio pause and select audio', async () => {
    const onAudioLyricChange = jest.fn()
    const wrapper = mount(createPlayer({ onAudioLyricChange }))
    wrapper.setState({ audioListsPanelVisible: true })
    wrapper.find('.audio-item').first().simulate('click')

    await sleep(1000)
    expect(onAudioLyricChange).toHaveBeenCalledTimes(1)

    wrapper.find('.audio-item').first().simulate('click')

    await sleep(1000)
    expect(onAudioLyricChange).toHaveBeenCalledTimes(1)
  })

  it('should match current audio lyric', () => {
    const onAudioLyricChange = jest.fn()
    const wrapper = mount(createPlayer({ onAudioLyricChange }))
    wrapper.find('.next-audio').simulate('click')
    expect(wrapper.state().lyric).toEqual('')
  })

  it('should match current audio lyric by audio item panel', () => {
    const onAudioLyricChange = jest.fn()
    const wrapper = mount(createPlayer({ onAudioLyricChange }))
    wrapper.setState({ audioListsPanelVisible: true })
    wrapper.find('.audio-item').last().simulate('click')
    expect(wrapper.state().lyric).toEqual('')
  })

  it('drives timed lyric data from the audio clock and clears gaps', () => {
    const wrapper = mount(
      createPlayer({
        autoPlay: false,
        audioLists: [{ musicSrc: 'timed', lyricData: timedLyricData }],
      }),
    )
    const { audioTimeUpdate } = wrapper.instance()

    wrapper.instance().audio.currentTime = 1
    audioTimeUpdate()
    expect(wrapper.state().currentLyric).toEqual('Timed line 1')

    wrapper.instance().audio.currentTime = 2
    audioTimeUpdate()
    expect(wrapper.state().currentLyric).toEqual('')

    wrapper.instance().audio.currentTime = 3
    audioTimeUpdate()
    expect(wrapper.state().currentLyric).toEqual('Timed line 2')

    wrapper.instance().audio.currentTime = 4
    audioTimeUpdate()
    expect(wrapper.state().currentLyric).toEqual('')
  })

  it('updates timed lyrics immediately when seeking while paused', () => {
    const wrapper = mount(
      createPlayer({
        autoPlay: false,
        audioLists: [{ musicSrc: 'timed', lyricData: timedLyricData }],
      }),
    )
    wrapper.setState({ playing: false })

    wrapper.instance().onProgressChange(3.5)
    expect(wrapper.state().currentLyric).toEqual('Timed line 2')
    wrapper.instance().onAudioSeeked(2.5)
    expect(wrapper.state().currentLyric).toEqual('')
  })

  it('shows explicit static lyric data independently of playback time', () => {
    const wrapper = mount(
      createPlayer({
        autoPlay: false,
        audioLists: [
          {
            musicSrc: 'static',
            lyricData: { kind: 'static', text: 'Untimed lyrics' },
          },
        ],
      }),
    )

    expect(wrapper.state().currentLyric).toEqual('Untimed lyrics')
    wrapper.instance().audio.currentTime = 120
    wrapper.instance().audioTimeUpdate()
    expect(wrapper.state().currentLyric).toEqual('Untimed lyrics')
  })

  it('quietly refreshes current lyric data without resetting playback', () => {
    const audioLists = [
      { musicSrc: 'same', name: 'same', uuid: 'same-id' },
      { musicSrc: 'next', name: 'next', uuid: 'next-id' },
    ]
    const wrapper = mount(
      createPlayer({
        audioLists,
        autoPlay: false,
        quietUpdate: true,
      }),
    )
    const { audio } = wrapper.instance()
    const playerKey = wrapper.state().playId
    const queueKeys = wrapper
      .state()
      .audioLists.map((item) => item.__PLAYER_KEY__)
    audio.currentTime = 1.5
    audio.load.mockClear()
    wrapper.setState({ currentTime: 1.5, playing: true })

    wrapper.setProps({
      audioLists: [
        { ...audioLists[0], lyricData: timedLyricData },
        audioLists[1],
      ],
    })

    expect(wrapper.instance().audio).toBe(audio)
    expect(audio.load).not.toHaveBeenCalled()
    expect(audio.currentTime).toEqual(1.5)
    expect(wrapper.state().currentTime).toEqual(1.5)
    expect(wrapper.state().playing).toBeTruthy()
    expect(wrapper.state().playId).toEqual(playerKey)
    expect(wrapper.state().audioLists).toHaveLength(2)
    expect(
      wrapper.state().audioLists.map((item) => item.__PLAYER_KEY__),
    ).toEqual(queueKeys)
    expect(wrapper.state().audioLists[0].__PLAYER_KEY__).toEqual(playerKey)
    expect(wrapper.state().currentLyric).toEqual('Timed line 1')
  })

  it('suppresses stale parser callbacks after the lyric model changes', () => {
    const audioLists = [
      { musicSrc: 'same', name: 'same', lyricData: timedLyricData },
    ]
    const wrapper = mount(
      createPlayer({
        audioLists,
        autoPlay: false,
        quietUpdate: true,
      }),
    )
    const staleParser = wrapper.instance().lyric

    wrapper.setProps({
      audioLists: [
        {
          ...audioLists[0],
          lyricData: { kind: 'static', text: 'New static lyrics' },
        },
      ],
    })
    staleParser.handler({ txt: 'Stale timed lyrics', lineNum: 0 })

    expect(wrapper.state().currentLyric).toEqual('New static lyrics')
  })

  it('clears the previous track lyric immediately when tracks change', () => {
    const wrapper = mount(
      createPlayer({
        autoPlay: false,
        audioLists: [
          { musicSrc: 'first', lyricData: timedLyricData },
          { musicSrc: 'second' },
        ],
      }),
    )
    wrapper.instance().audio.currentTime = 1.5
    wrapper.instance().audioTimeUpdate()
    expect(wrapper.state().currentLyric).toEqual('Timed line 1')

    wrapper.find('.next-audio').simulate('click')
    expect(wrapper.state().lyricData).toBeUndefined()
    expect(wrapper.state().currentLyric).toEqual('')
  })
})
