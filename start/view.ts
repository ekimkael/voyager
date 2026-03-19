import edge from 'edge.js'
import { edgeIconify, addCollection } from 'edge-iconify'
import { icons as tablerIcons } from '@iconify-json/tabler'

addCollection(tablerIcons)
edge.use(edgeIconify)
